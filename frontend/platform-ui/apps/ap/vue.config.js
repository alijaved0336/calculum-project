const webpack = require('webpack')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execSync } = require('node:child_process')
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
const version = packageJson.version || '0.0.0'
const versionDate = new Date().toISOString().slice(0, 10).replace(/-/g, '')

// Sentry release identifier: <package-version>+<git-short-sha> (e.g. 1.96.0+a09f2bc).
// Computed once here so the runtime Sentry.init tag (via DefinePlugin) and the
// source maps uploaded by sentryWebpackPlugin always reference the same release.
let shortSha = 'local'
try {
  shortSha = execSync('git rev-parse --short HEAD').toString().trim()
} catch (e) {
  // local dev without git history; keep 'local' fallback
  console.warn(`[sentry-release] git short SHA unavailable, using fallback "${shortSha}": ${e.message}`)
}
const release = `${version}+${shortSha}`

const certPath = path.resolve(__dirname, 'ssl/localhost.pem')
const keyPath = path.resolve(__dirname, 'ssl/localhost-key.pem')

const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath)

const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');

module.exports = {
  productionSourceMap: false,
  configureWebpack: config => {
     if (!config.plugins) {
      config.plugins = []
    }
    if (process.env.SENTRY_AUTH_TOKEN) {
      config.devtool = "hidden-source-map";
      config.plugins.push(
        sentryWebpackPlugin({
          org: "calculum",
          project: "ada-vue",
          authToken: process.env.SENTRY_AUTH_TOKEN,
          release: {
            name: release,
            setCommits: {
              auto: true,
              ignoreMissing: true,
            },
          },
          sourcemaps: {
            filesToDeleteAfterUpload: ["./dist/**/*.map"],
          },
        })
      );
    };
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.PACKAGE_VERSION': JSON.stringify(version),
        'process.env.PACKAGE_VERSION_DATE': JSON.stringify(versionDate),
        'process.env.RELEASE_VERSION': JSON.stringify(release)
      })
    );
    config.optimization = {
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: Infinity,
        minSize: 20_000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const match = module.context?.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
              if (match) {
                const hash = crypto
                  .createHash('md5')
                  .update(match[1])
                  .digest('hex')
                  .slice(0, 8);
                return `vendor.${hash}`;
              }
              return null;
            },
            priority: 20,
          },
        },
      },
      runtimeChunk: 'single',
    };

    /* 3️⃣  Performance */
    config.performance = {
      hints: false,
      maxEntrypointSize: 512_000,
      maxAssetSize: 512_000,
    };

    /* 4️⃣  Reglas de recursos */
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|svg)$/i,
      type: 'asset/resource',
      generator: { filename: 'img/[name][ext]' },
    });
    // optimization: {
    //   splitChunks: {
    //     chunks: 'all',
    //     maxInitialRequests: Infinity,
    //     minSize: 20000,
    //     cacheGroups: {
    //       vendor: {
    //         test: /[\\/]node_modules[\\/]/,
    //         name(module) {
    //           const match = module.context && module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
    //           if (match) {
    //             const hash = crypto.createHash('md5').update(match[1]).digest('hex').slice(0, 8);
    //             return `vendor.${hash}`;
    //           }
    //           return null;
    //         },
    //         priority: 20
    //       }
    //     }
    //   },
    //   runtimeChunk: 'single'
    // },
    // performance: {
    //   hints: false,
    //   maxEntrypointSize: 512000,
    //   maxAssetSize: 512000
    // },
    // module: {
    //   rules: [
    //     {
    //       test: /\.(png|jpe?g|gif|svg)$/i,
    //       type: 'asset/resource',
    //       generator: {
    //         filename: 'img/[name][ext]'
    //       }
    //     }
    //   ]
    // },
    // ignoreWarnings: [
    //   warning =>
    //     typeof warning.message === 'string' &&
    //     warning.message.includes('Global built-in functions are deprecated')
    // ],
    // stats: 'normal', // ⬅️ permite seguir viendo logs normales (como sourcemaps)
  },
  
  devServer: {
    host: 'localhost',
    server: useHttps ? {
      type: 'https',
      options: {
        key: fs.readFileSync('./ssl/localhost-key.pem'),
        cert: fs.readFileSync('./ssl/localhost.pem'),
      }
    } : 'http',
    port: 8081,
    client: {
      overlay: false
    },
    proxy: {
      '/api': {
        target: 'https://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
        onProxyReq: (proxyReq, req, res) => {
          // Handle OPTIONS requests
          if (req.method === 'OPTIONS') {
            res.writeHead(200, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
              'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization, idk',
              'Access-Control-Allow-Credentials': 'true',
              'Access-Control-Max-Age': '86400'
            });
            res.end();
            return;
          }
        },
        onProxyRes: (proxyRes, req, res) => {
          // Add CORS headers to all responses
          proxyRes.headers['Access-Control-Allow-Origin'] = '*';
          proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
          proxyRes.headers['Access-Control-Allow-Headers'] = 'X-Requested-With, content-type, Authorization, idk';
          proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
        }
      }
    }
  },
}
