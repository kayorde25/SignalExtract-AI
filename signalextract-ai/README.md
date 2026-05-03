# SignalExtract AI

SignalExtract AI is a modern application designed to extract and analyze signals from various data sources. This project is structured into two main applications: a web application and an API, both of which are developed using TypeScript.

## Project Structure

The project is organized as follows:

```
signalextract-ai
├── apps
│   ├── web                # Web application
│   │   ├── src
│   │   │   ├── app        # Main application logic
│   │   │   ├── components  # Reusable UI components
│   │   │   ├── lib        # Utility functions and libraries
│   │   │   └── types      # TypeScript types and interfaces
│   │   ├── tests
│   │   │   └── unit       # Unit tests for web application
│   │   ├── package.json    # Web app configuration
│   │   └── tsconfig.json   # TypeScript configuration for web app
│   └── api                # API application
│       ├── src
│       │   ├── controllers # API request handlers
│       │   ├── routes      # API route definitions
│       │   ├── services     # Business logic and data manipulation
│       │   └── types       # TypeScript types and interfaces for API
│       ├── tests
│       │   └── unit        # Unit tests for API
│       ├── package.json     # API configuration
│       └── tsconfig.json    # TypeScript configuration for API
├── tests
│   └── e2e
│       ├── specs           # End-to-end test specifications
│       └── playwright.config.ts # Playwright configuration for E2E testing
├── package.json            # Root configuration for the project
├── tsconfig.json           # Root TypeScript configuration
├── .eslintrc.json          # ESLint configuration
├── .prettierrc             # Prettier configuration
└── README.md               # Project documentation
```

## Getting Started

To get started with the SignalExtract AI project, follow these steps:

1. **Clone the repository:**
   ```
   git clone https://github.com/kayorde25/SignalExtract-AI.git
   cd SignalExtract-AI
   ```

2. **Install dependencies:**
   For the web application:
   ```
   cd apps/web
   npm install
   ```

   For the API:
   ```
   cd ../api
   npm install
   ```

3. **Run the applications:**
   - Start the web application:
     ```
     cd apps/web
     npm start
     ```

   - Start the API:
     ```
     cd ../api
     npm start
     ```

4. **Run tests:**
   - For unit tests in the web application:
     ```
     cd apps/web
     npm test
     ```

   - For unit tests in the API:
     ```
     cd ../api
     npm test
     ```

   - For end-to-end tests:
     ```
     cd tests/e2e
     npx playwright test
     ```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.