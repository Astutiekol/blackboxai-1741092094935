#!/bin/bash

# Install dependencies with legacy peer deps to handle Material-UI compatibility
npm install --legacy-peer-deps --save \
  @mui/material@5.14.0 \
  @mui/icons-material@5.14.0 \
  @emotion/react@11.11.1 \
  @emotion/styled@11.11.0 \
  react@18.2.0 \
  react-dom@18.2.0 \
  react-router-dom@6.14.2 \
  react-toastify@9.1.3 \
  axios@1.4.0 \
  @solana/web3.js@1.78.0 \
  typescript@4.9.5

# Install dev dependencies
npm install --save-dev \
  @types/react@18.2.18 \
  @types/react-dom@18.2.7 \
  @types/node@20.4.5 \
  @types/jest@29.5.3 \
  @typescript-eslint/eslint-plugin@5.62.0 \
  @typescript-eslint/parser@5.62.0 \
  autoprefixer@10.4.14 \
  postcss@8.4.27 \
  tailwindcss@3.3.3

# Create necessary directories
mkdir -p src/types

# Initialize TypeScript configuration
echo '{
  "compilerOptions": {
    "target": "es2017",
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": "src",
    "paths": {
      "@/*": ["*"],
      "@components/*": ["components/*"],
      "@utils/*": ["utils/*"],
      "@contexts/*": ["contexts/*"],
      "@types/*": ["types/*"]
    }
  },
  "include": [
    "src"
  ]
}' > tsconfig.json

# Create package.json if it doesn't exist
if [ ! -f package.json ]; then
  echo '{
    "name": "solana-lottery-frontend",
    "version": "1.0.0",
    "private": true,
    "dependencies": {},
    "scripts": {
      "start": "react-scripts start",
      "build": "react-scripts build",
      "test": "react-scripts test",
      "eject": "react-scripts eject"
    },
    "browserslist": {
      "production": [
        ">0.2%",
        "not dead",
        "not op_mini all"
      ],
      "development": [
        "last 1 chrome version",
        "last 1 firefox version",
        "last 1 safari version"
      ]
    }
  }' > package.json
fi

# Create a .env file with default values
echo 'REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=ws://localhost:5000
REACT_APP_SOLANA_NETWORK=devnet
REACT_APP_SOLANA_RPC_URL=https://api.devnet.solana.com' > .env

# Initialize Tailwind CSS
echo "module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}" > tailwind.config.js

# Create postcss config
echo "module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}" > postcss.config.js

echo "Setup complete! You can now start the development server with 'npm start'"
