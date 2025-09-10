# Mess Notification System

A comprehensive email notification system for mess/cafeteria meal schedules. Users can subscribe to receive automated email notifications 30 minutes before each meal (breakfast, lunch, snacks, dinner).

## Features

- **Automated Email Notifications**: Sends emails 30 minutes before each meal
- **Multiple Mess Types**: Supports South, North, and Unified mess systems
- **Diet Preferences**: Vegetarian and Non-Vegetarian options
- **Category Selection**: A, B, C, D categories for different meal plans
- **Week Rotation**: Automatic week calculation (A, B, C, D rotation)
- **One-time Subscription**: Prevents duplicate email subscriptions
- **Responsive Web Interface**: Clean, modern UI for easy subscription
- **IST Timezone Support**: All notifications are sent in Indian Standard Time

## Notification Schedule

- **Breakfast**: 6:30 AM IST (30 min before 7:00 AM)
- **Lunch**: 11:30 AM IST (30 min before 12:00 PM)  
- **Snacks**: 4:00 PM IST (30 min before 4:30 PM)
- **Dinner**: 6:30 PM IST (30 min before 7:00 PM)

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the root directory:

```env
# Gmail SMTP Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./database.sqlite
```

### 2. Gmail App Password Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account settings → Security → 2-Step Verification
3. Generate an "App Password" for this application
4. Use the generated 16-character password in the `.env` file

### 3. Installation

```bash
# Install dependencies
npm install

# Start the server
npm start

# For development with auto-restart
npm run dev
```

### 4. Access the Application

Open your browser and navigate to `http://localhost:3000`

## Menu Data Structure

The system supports three menu types:
- `South_veg_non-veg_json.json` - South Indian menu
- `North_veg_non-veg_json.json` - North Indian menu  
- `unified_all_json.json` - Unified menu system

Each menu follows a weekly rotation (Week A → B → C → D → A...) with different categories (A, B, C, D) for meal variations.

## API Endpoints

- `POST /api/subscribe` - Subscribe to notifications
- `GET /api/current-week` - Get current week information
- `POST /api/test-email` - Send test email (development)

## Database Schema

The system uses SQLite with the following table structure:

```sql
CREATE TABLE subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    mess_type TEXT NOT NULL,
    diet_type TEXT NOT NULL,
    mess_category TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);
```

## Email Template

Emails include:
- Meal session and timing information
- Complete menu items for the day
- Additional information about always-available items
- Responsive HTML design with proper styling

## Cron Jobs

The system uses `node-cron` to schedule notifications:
- All times are in IST (Asia/Kolkata timezone)
- Automatic execution without manual intervention
- Error handling and logging for failed email deliveries

## Security Features

- Email validation and sanitization
- Duplicate subscription prevention
- Environment variable protection
- SQL injection prevention with parameterized queries

## Troubleshooting

### Common Issues:

1. **Emails not sending**: Check Gmail app password and 2FA setup
2. **Wrong timing**: Verify server timezone is set correctly
3. **Database errors**: Ensure write permissions for SQLite file
4. **Menu not found**: Verify JSON file structure and week calculation

### Logs:

The system provides detailed console logging for:
- Subscription events
- Email sending status
- Cron job execution
- Error tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.