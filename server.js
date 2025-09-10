const express = require('express');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const moment = require('moment-timezone');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database(process.env.DB_PATH || './database.sqlite');

// Initialize database
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    mess_type TEXT NOT NULL,
    diet_type TEXT NOT NULL,
    mess_category TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
  )`);
});

// Load menu data
const southMenu = require('./South_veg_non-veg_json.json');
const northMenu = require('./North_veg_non-veg_json.json');
const unifiedMenu = require('./unified_all_json.json');

// Email transporter setup
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Week calculation logic
function getCurrentWeek() {
  const startDate = moment('2024-01-01'); // Reference start date (adjust as needed)
  const currentDate = moment();
  const weeksPassed = currentDate.diff(startDate, 'weeks');
  const weekOrder = ['A', 'B', 'C', 'D'];
  
  // Since current week is C (index 2), adjust calculation
  const currentWeekIndex = (weeksPassed + 2) % 4; // +2 because current is C
  return weekOrder[currentWeekIndex];
}

// Get menu data based on type
function getMenuData(messType, dietType) {
  switch(messType.toLowerCase()) {
    case 'south':
      return southMenu.menuSystem.south[dietType];
    case 'north':
      return northMenu.menuSystem.north[dietType];
    case 'unified':
      return unifiedMenu.menuSystem.unified[dietType];
    default:
      return null;
  }
}

// Get current day's menu
function getTodaysMenu(messType, dietType, messCategory) {
  const menuData = getMenuData(messType, dietType);
  if (!menuData) return null;

  const currentWeek = getCurrentWeek();
  const currentDay = moment().tz('Asia/Kolkata').format('dddd').toLowerCase();
  
  const weekKey = `week${currentWeek}`;
  const categoryKey = messCategory.toLowerCase();
  
  if (menuData[weekKey] && menuData[weekKey][currentDay]) {
    return menuData[weekKey][currentDay];
  }
  
  return null;
}

// Format email content
function formatEmailContent(menuItems, session, messType, dietType, messCategory) {
  const currentWeek = getCurrentWeek();
  const currentDay = moment().tz('Asia/Kolkata').format('dddd');
  
  let emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">🍽️ Mess Menu Notification</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">${messType.toUpperCase()} ${dietType.toUpperCase()} - Category ${messCategory.toUpperCase()}</p>
      </div>
      
      <div style="background-color: white; padding: 20px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #34495e; margin: 0; font-size: 20px;">${session.toUpperCase()} MENU</h2>
          <p style="color: #7f8c8d; margin: 5px 0;">${currentDay}, Week ${currentWeek}</p>
          <p style="color: #e74c3c; font-weight: bold; margin: 5px 0;">⏰ Starting in 30 minutes!</p>
        </div>
        
        <div style="background-color: #ecf0f1; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 16px;">📋 Today's Items:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #34495e;">
  `;
  
  menuItems.forEach(item => {
    emailContent += `<li style="margin: 5px 0; font-size: 14px;">${item}</li>`;
  });
  
  emailContent += `
          </ul>
        </div>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #27ae60;">
          <h4 style="color: #27ae60; margin: 0 0 10px 0; font-size: 14px;">📌 Additional Information:</h4>
          <p style="margin: 0; font-size: 12px; color: #2c3e50; line-height: 1.4;">
            <strong>Always Available:</strong> Brown & White Bread, Butter, Tea, Coffee, Milk, Sugar<br>
            <strong>With Lunch & Snacks:</strong> Plain Rice, Curd, Salt, Sugar, Papad/Fryums & Salad<br>
            <strong>With Dinner:</strong> Buttermilk/Lemon Juice, Papad/Fryums & Salad, Cut onion, Mirchi, Lemon
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
          <p style="color: #7f8c8d; font-size: 12px; margin: 0;">
            You're receiving this because you subscribed to mess notifications.<br>
            Have a great meal! 🍽️
          </p>
        </div>
      </div>
    </div>
  `;
  
  return emailContent;
}

// Send notification emails
async function sendNotifications(session) {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM subscribers WHERE is_active = 1", async (err, subscribers) => {
      if (err) {
        console.error('Database error:', err);
        return reject(err);
      }

      console.log(`Sending ${session} notifications to ${subscribers.length} subscribers...`);
      
      for (const subscriber of subscribers) {
        try {
          const todaysMenu = getTodaysMenu(subscriber.mess_type, subscriber.diet_type, subscriber.mess_category);
          
          if (!todaysMenu || !todaysMenu[session]) {
            console.log(`No menu found for ${subscriber.email} - ${subscriber.mess_type} ${subscriber.diet_type} ${subscriber.mess_category}`);
            continue;
          }

          const menuItems = todaysMenu[session];
          const emailContent = formatEmailContent(menuItems, session, subscriber.mess_type, subscriber.diet_type, subscriber.mess_category);
          
          const mailOptions = {
            from: process.env.GMAIL_USER,
            to: subscriber.email,
            subject: `🍽️ ${session.charAt(0).toUpperCase() + session.slice(1)} Menu - Starting in 30 minutes!`,
            html: emailContent
          };

          await transporter.sendMail(mailOptions);
          console.log(`✅ Email sent to ${subscriber.email} for ${session}`);
          
        } catch (error) {
          console.error(`❌ Failed to send email to ${subscriber.email}:`, error.message);
        }
      }
      
      resolve();
    });
  });
}

// Schedule cron jobs (IST timezone)
// Breakfast: 6:30 AM IST (30 min before 7:00 AM)
cron.schedule('30 6 * * *', () => {
  console.log('🌅 Sending breakfast notifications...');
  sendNotifications('breakfast');
}, {
  timezone: "Asia/Kolkata"
});

// Lunch: 11:30 AM IST (30 min before 12:00 PM)
cron.schedule('30 11 * * *', () => {
  console.log('🌞 Sending lunch notifications...');
  sendNotifications('lunch');
}, {
  timezone: "Asia/Kolkata"
});

// Snacks: 4:00 PM IST (30 min before 4:30 PM)
cron.schedule('0 16 * * *', () => {
  console.log('🍪 Sending snacks notifications...');
  sendNotifications('snacks');
}, {
  timezone: "Asia/Kolkata"
});

// Dinner: 6:30 PM IST (30 min before 7:00 PM)
cron.schedule('30 18 * * *', () => {
  console.log('🌙 Sending dinner notifications...');
  sendNotifications('dinner');
}, {
  timezone: "Asia/Kolkata"
});

// API Routes
app.post('/api/subscribe', (req, res) => {
  const { email, messType, dietType, messCategory } = req.body;
  
  if (!email || !messType || !dietType || !messCategory) {
    return res.status(400).json({ 
      success: false, 
      message: 'All fields are required' 
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please enter a valid email address' 
    });
  }

  // Check if email already exists
  db.get("SELECT * FROM subscribers WHERE email = ?", [email], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error occurred' 
      });
    }

    if (row) {
      return res.status(409).json({ 
        success: false, 
        message: 'This email is already subscribed to notifications' 
      });
    }

    // Insert new subscriber
    db.run(
      "INSERT INTO subscribers (email, mess_type, diet_type, mess_category) VALUES (?, ?, ?, ?)",
      [email, messType, dietType, messCategory],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to subscribe' 
          });
        }

        console.log(`✅ New subscriber: ${email} - ${messType} ${dietType} ${messCategory}`);
        res.json({ 
          success: true, 
          message: 'Successfully subscribed to mess notifications!' 
        });
      }
    );
  });
});

// Get current week info
app.get('/api/current-week', (req, res) => {
  const currentWeek = getCurrentWeek();
  const currentDay = moment().tz('Asia/Kolkata').format('dddd');
  
  res.json({
    week: currentWeek,
    day: currentDay,
    timezone: 'Asia/Kolkata'
  });
});

// Test email endpoint (for development)
app.post('/api/test-email', async (req, res) => {
  const { email, session } = req.body;
  
  try {
    const testMenuItems = ['Test Item 1', 'Test Item 2', 'Test Item 3'];
    const emailContent = formatEmailContent(testMenuItems, session || 'breakfast', 'south', 'vegetarian', 'A');
    
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: `🧪 Test Email - ${session || 'breakfast'} Menu`,
      html: emailContent
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Test email sent successfully!' });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ success: false, message: 'Failed to send test email' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mess Notification System running on port ${PORT}`);
  console.log(`📧 Gmail configured: ${process.env.GMAIL_USER ? 'Yes' : 'No'}`);
  console.log(`📅 Current week: ${getCurrentWeek()}`);
  console.log(`🕐 Current time (IST): ${moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')}`);
});