const express = require('express');
const cronParser = require('cron-parser');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// Auth middleware - validates session against auth.jdms.nl
async function requireAuth(req, res, next) {
  const sessionToken = req.cookies['__Secure-next-auth.session-token'] || 
                       req.cookies['next-auth.session-token'];
  
  if (!sessionToken) {
    const callbackUrl = encodeURIComponent(`https://cron.jdms.nl${req.originalUrl}`);
    return res.redirect(`https://auth.jdms.nl/login?callbackUrl=${callbackUrl}`);
  }

  try {
    const response = await fetch('https://auth.jdms.nl/api/validate', {
      headers: {
        Cookie: `__Secure-next-auth.session-token=${sessionToken}`
      }
    });
    const data = await response.json();

    if (data.valid) {
      req.user = data.user;
      return next();
    }
  } catch (error) {
    console.error('Auth validation error:', error.message);
  }

  const callbackUrl = encodeURIComponent(`https://cron.jdms.nl${req.originalUrl}`);
  res.redirect(`https://auth.jdms.nl/login?callbackUrl=${callbackUrl}`);
}

// Protect the main page
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Static assets (CSS, JS loaded by the page)
app.use(express.static('public'));

// Parse cron expression and return details
app.post('/api/parse', requireAuth, (req, res) => {
  try {
    const { expression } = req.body;
    if (!expression) {
      return res.status(400).json({ error: 'Expression required' });
    }

    const interval = cronParser.parseExpression(expression);
    const nextRuns = [];
    
    for (let i = 0; i < 5; i++) {
      nextRuns.push(interval.next().toISOString());
    }

    const description = describeCron(expression);
    
    res.json({
      valid: true,
      expression,
      description,
      nextRuns
    });
  } catch (err) {
    res.status(400).json({ 
      valid: false, 
      error: err.message 
    });
  }
});

// Human-readable description of cron
function describeCron(expr) {
  const parts = expr.split(' ');
  if (parts.length !== 5) return 'Invalid expression';
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  // Common patterns
  if (expr === '* * * * *') return 'Every minute';
  if (expr === '0 * * * *') return 'Every hour, on the hour';
  if (expr === '0 0 * * *') return 'Every day at midnight';
  if (expr === '0 0 * * 0') return 'Every Sunday at midnight';
  if (expr === '0 0 1 * *') return 'First day of every month at midnight';
  if (expr === '0 0 1 1 *') return 'Every January 1st at midnight';
  
  let desc = [];
  
  // Minute
  if (minute === '*') {
    desc.push('Every minute');
  } else if (minute.includes('/')) {
    desc.push(`Every ${minute.split('/')[1]} minutes`);
  } else if (minute.includes(',')) {
    desc.push(`At minutes ${minute}`);
  } else if (minute.includes('-')) {
    desc.push(`Minutes ${minute}`);
  } else {
    desc.push(`At minute ${minute}`);
  }
  
  // Hour
  if (hour === '*') {
    desc.push('of every hour');
  } else if (hour.includes('/')) {
    desc.push(`every ${hour.split('/')[1]} hours`);
  } else if (hour.includes(',')) {
    desc.push(`at hours ${hour}`);
  } else if (hour.includes('-')) {
    desc.push(`hours ${hour}`);
  } else {
    desc.push(`at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`);
    desc.shift();
  }
  
  // Day of month
  if (dayOfMonth !== '*') {
    if (dayOfMonth.includes(',')) {
      desc.push(`on days ${dayOfMonth}`);
    } else if (dayOfMonth.includes('/')) {
      desc.push(`every ${dayOfMonth.split('/')[1]} days`);
    } else {
      desc.push(`on day ${dayOfMonth}`);
    }
  }
  
  // Month
  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  if (month !== '*') {
    if (month.includes(',')) {
      const monthNames = month.split(',').map(m => months[parseInt(m)] || m).join(', ');
      desc.push(`in ${monthNames}`);
    } else if (!month.includes('/') && !month.includes('-')) {
      desc.push(`in ${months[parseInt(month)] || month}`);
    }
  }
  
  // Day of week
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (dayOfWeek !== '*') {
    if (dayOfWeek.includes(',')) {
      const dayNames = dayOfWeek.split(',').map(d => days[parseInt(d)] || d).join(', ');
      desc.push(`on ${dayNames}`);
    } else if (!dayOfWeek.includes('/') && !dayOfWeek.includes('-')) {
      desc.push(`on ${days[parseInt(dayOfWeek)] || dayOfWeek}`);
    }
  }
  
  return desc.join(' ') || 'Custom schedule';
}

app.listen(PORT, () => {
  console.log(`Cron builder running on port ${PORT}`);
});
