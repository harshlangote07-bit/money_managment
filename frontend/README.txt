Foresight routing refactor

This refactor preserves the existing UI in src/Workspace.jsx, adds real URLs through React Router, and extracts Sidebar and Topbar into reusable components.

Keep your existing src/App.css, src/index.css, public assets, index.html, and Vite config. Copy the included src files into your frontend/src folder and merge react-router-dom into package.json (the included package.json retains your scripts and dependencies). Then run npm install and npm run dev.

Routes: /, /login, /dashboard, /planner, /simulator, /recovery, /recommendations, /profile. Demo login is not secure authentication.
