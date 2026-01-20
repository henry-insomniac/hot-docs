module.exports = {
  apps: [
    {
      name: "hot-docs-sync",
      script: "scripts/deploy-watch.mjs",
      interpreter: "node",
      cwd: __dirname,
      args: [
        "--host",
        process.env.HOT_DOCS_DEPLOY_HOST ?? "",
        "--user",
        process.env.HOT_DOCS_DEPLOY_USER ?? "",
        "--dest",
        process.env.HOT_DOCS_DEPLOY_DEST ?? ""
      ],
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1500,
      time: true,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
