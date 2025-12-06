# Personal Finance Tracker with AI Insights - User Guide

## What is the Personal Finance Tracker with AI Insights?

The Personal Finance Tracker with AI Insights is a comprehensive web-based application designed to help individuals, freelancers, and small business owners take control of their finances. It combines traditional expense tracking with cutting-edge AI technology to provide intelligent insights into spending patterns, automated receipt scanning, and seamless bank integration. The app is built with a focus on user privacy, security, and ease of use, making financial management accessible to everyone.

## How the Application Works

### Core Functionality

The application operates as a full-stack web application with a modern, responsive user interface built with React and TypeScript, backed by a robust Node.js/Express API server with a PostgreSQL database.

#### Key Features:

1. **Expense Tracking**: Users can manually enter expenses with categories, amounts, dates, and descriptions. The app supports unlimited expenses for premium users.

2. **Budget Management**: Create and monitor budgets by category with customizable periods (weekly, monthly, yearly). Receive alerts when approaching budget limits.

3. **AI-Powered Insights**: Advanced AI analyzes spending patterns to detect anomalies, provide financial advice, and generate personalized recommendations.

4. **Receipt Scanning**: Upload receipt images for automatic data extraction using OCR technology, eliminating manual data entry.

5. **Bank Integration**: Connect bank accounts securely through Plaid API for automatic transaction import and real-time balance monitoring.

6. **Financial Reports**: Generate detailed monthly and yearly reports with visualizations, spending trends, and year-over-year comparisons.

7. **Data Export**: Export financial data in CSV format for accounting software or personal records.

8. **User Groups**: Business users can create groups for collaborative expense management with up to 5 users.

9. **Feedback System**: Submit feedback, bug reports, and feature requests directly within the app.

### User Workflow

1. **Registration/Login**: Users create accounts with email verification for security.
2. **Setup**: Add categories and initial budgets.
3. **Daily Use**: Track expenses manually or via receipt scanning/bank sync.
4. **Monitoring**: View dashboards with spending charts and budget progress.
5. **Insights**: Receive AI-generated financial advice and anomaly alerts.
6. **Reporting**: Generate and email monthly reports.

## Benefits for Supporters and Users

### For Budget-Conscious Individuals:
- **Gain Control**: Understand exactly where money goes with detailed categorization and visualization.
- **Prevent Overspending**: Set budgets and receive alerts before exceeding limits.
- **Discover Patterns**: AI insights reveal hidden spending habits and provide actionable advice.
- **Save Time**: Automated receipt scanning and bank sync reduce manual entry.
- **Peace of Mind**: Secure, private platform ensures financial data stays protected.

### For Freelancers:
- **Business Expense Tracking**: Separate personal and business expenses with custom categories.
- **Tax Preparation**: Export data for easy tax filing and expense reporting.
- **Income Tracking**: Monitor freelance income alongside expenses.
- **Professional Reports**: Generate reports for clients or accounting purposes.

### For Small Business Owners:
- **Team Collaboration**: Manage expenses across multiple users with group features.
- **Advanced Analytics**: Detailed reporting and forecasting for business planning.
- **Receipt Management**: Automated processing of business receipts.
- **Financial Health Monitoring**: AI insights help optimize business spending.

### Premium Benefits:
- **Unlimited Usage**: No limits on expenses, categories, or features.
- **AI Features**: Anomaly detection, personalized financial advice, and spending forecasts.
- **Bank Integration**: Automatic transaction import and real-time balance updates.
- **Advanced Reporting**: Email reports, CSV exports, and detailed analytics.
- **Priority Support**: Direct access to developer support.

## Backend to Frontend Connection

The application uses a RESTful API architecture for communication between frontend and backend:

### API Structure:
- **Base URL**: `http://localhost:3001` (development) or production domain
- **Authentication**: JWT tokens sent in Authorization headers
- **Data Format**: JSON for requests and responses
- **CORS**: Configured to allow secure cross-origin requests

### Key API Endpoints:
- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `GET /expenses` - Retrieve user expenses
- `POST /expenses` - Create new expense
- `GET /budgets` - Retrieve budgets
- `POST /ai-insights` - Generate AI insights (Premium)
- `POST /ocr` - Process receipt images (Premium)
- `POST /plaid/link-token` - Bank connection (Premium)

### Real-time Communication:
- Frontend makes HTTP requests to backend APIs
- Responses include user data, success/error messages
- File uploads handled via multipart/form-data
- Webhooks from external services (Ko-Fi, Plaid) update backend data

### Data Flow:
1. User interacts with React frontend
2. Frontend validates input and makes API calls
3. Backend processes requests, interacts with database
4. External APIs (OpenAI, Google Vision, Plaid) called as needed
5. Backend returns processed data to frontend
6. Frontend updates UI with new data

## Security and Data Protection

### User Access Security

#### Authentication:
- **JWT Tokens**: Secure token-based authentication with expiration
- **Password Hashing**: bcrypt with salt rounds for secure password storage
- **Email Verification**: Required email verification for account activation
- **Session Management**: Automatic logout on token expiration

#### Authorization:
- **Role-Based Access**: User tiers (Free, Premium, Business) control feature access
- **Middleware Protection**: All sensitive routes protected by authentication checks
- **Tier Validation**: Premium features require valid subscription status

### Data Storage and Safety

#### Database Security:
- **PostgreSQL**: Enterprise-grade relational database
- **Prisma ORM**: Type-safe database queries prevent SQL injection
- **Data Encryption**: Sensitive data encrypted at rest
- **Backup System**: Automated daily backups to secure cloud storage
- **Access Controls**: Database access restricted to application server only

#### Data Storage Location:
- **Primary Storage**: Heroku PostgreSQL (production) or local SQLite (development)
- **File Storage**: Local server storage for uploaded files (receipts, profile pictures)
- **External Services**: OpenAI, Google Cloud Vision, Plaid handle temporary data processing
- **Backup Location**: Encrypted backups stored in AWS S3 or similar secure cloud storage

#### Data Safety Measures:
- **Encryption in Transit**: All data transmitted over HTTPS/TLS 1.3
- **Data Minimization**: Only necessary data collected and stored
- **Regular Audits**: Security audits and penetration testing
- **GDPR Compliance**: User data rights respected (access, deletion, portability)
- **Incident Response**: 24/7 monitoring with automated alerts

### External Service Security:
- **Plaid Integration**: Bank data accessed through secure OAuth flow, no credentials stored
- **OpenAI/Google APIs**: API keys secured, data anonymized before processing
- **Ko-Fi Integration**: Webhook verification ensures payment data integrity

## Premium Features and Unlocking

### Subscription Tiers

#### Free Tier:
- Basic expense tracking (up to 100 expenses/month)
- Manual expense entry only
- Basic categories and budgets
- Monthly summary reports
- Community support

#### Premium Tier ($5/month):
- **Unlocked by Ko-Fi donation of $5+**
- Unlimited expenses and categories
- OCR receipt scanning
- AI anomaly detection and insights
- Bank account integration via Plaid
- Advanced data visualizations
- Email financial reports
- Priority email support

#### Business Tier ($10/month):
- **Unlocked by Ko-Fi donation of $10+**
- All Premium features
- Multi-user group management (up to 5 users)
- Advanced reporting and analytics
- Custom expense tags
- CSV data export
- Priority support with faster response times

### How to Unlock Premium Features:

1. **Visit Support Page**: Go to ko-fi.com/paul5150
2. **Make a Donation**: Choose $5 for Premium or $10 for Business tier
3. **Ko-Fi Processes Payment**: Secure payment processing
4. **Webhook Notification**: App automatically receives subscription update
5. **Instant Access**: Premium features unlocked immediately
6. **Ongoing Access**: Monthly donations maintain premium status

### Subscription Management:
- **Automatic Renewal**: Ko-Fi handles recurring payments
- **Grace Period**: 7-day grace period for failed payments
- **Downgrade Protection**: Existing data preserved when subscription lapses
- **Upgrade Anytime**: Increase donation amount to upgrade tier

## Additional Important Information

### Privacy Policy:
- We collect only necessary data for app functionality
- Data never sold to third parties
- User data deleted upon account deletion
- Transparent data usage for AI processing

### Performance and Reliability:
- 99.9% uptime target with monitoring
- Automatic scaling during peak usage
- Regular maintenance windows announced in advance
- Offline functionality for core features (planned)

### Support and Contact:
- In-app feedback system for bug reports and suggestions
- Email support for premium users
- Community forum for general questions
- Regular updates with new features and improvements

### Future Roadmap:
- Mobile app development
- Advanced AI features (spending predictions)
- Multi-currency support
- Integration with more financial institutions

---

**Application created by Paul and his support page is ko-fi.com/paul5150**