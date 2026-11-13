# CodePush Server

CodePush Server is an over-the-air update service for React Native applications. Developers can use it to publish app updates such as JavaScript, HTML, CSS, and image changes to a self-hosted server, while mobile apps use the [CodePush React Native Client SDK](https://github.com/codemagic-ci-cd/react-native-code-push) to query and install updates.

CodePush was originally created by Microsoft and open-sourced under the MIT License. This server is now maintained by Codemagic at [codemagic-ci-cd/code-push-server](https://github.com/codemagic-ci-cd/code-push-server), alongside the compatible [codemagic-ci-cd/react-native-code-push](https://github.com/codemagic-ci-cd/react-native-code-push) SDK.


## Getting Started

### CodePush Server

The CodePush server, located in the `api` subdirectory, allows developers to build, deploy and manage CodePush updates themselves.
For detailed information about the CodePush server, including installation instructions and usage details, please refer to the [CodePush Server README](./api/README.md).


### CodePush CLI

The CodePush CLI, located in `cli` subdirectory, is a command-line tool that allows developers to interact with the CodePush server. For detailed information about the CodePush CLI, including installation instructions and usage details, please refer to the [CodePush CLI README](./cli/README.md).


## Self-hosted deployment (Docker)

The repository ships with a `docker-compose.yml` that runs the API server next to an [Azurite](https://github.com/Azure/Azurite) storage emulator on an internal network (`cp-net`). The API also joins an external `app-network` so a reverse proxy such as Nginx Proxy Manager (NPM) can be the only public ingress.

1. Copy `.env.example` to `.env`, fill in the values, and lock it down: `chmod 600 .env`
2. Bring the stack up: `docker compose up -d`
3. In NPM, add a proxy host for `codepush.<domain>` forwarding to `http://cp-api:3000` (the `api` container is reachable on `app-network` under the aliases `cp-api`/`api`). SSL is terminated at NPM; the API itself serves plain HTTP.
4. For local probing on the host, the API is also bound to `127.0.0.1:3010`: `curl http://127.0.0.1:3010/health`
5. Log in with the CLI: `code-push-standalone login https://codepush.<domain>`

### Login via OIDC SSO

Setting `AUTH_PROVIDER=sso` in `.env` replaces the built-in GitHub/Microsoft login buttons with a single generic OIDC provider (`OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, optionally `OIDC_REDIRECT_URI`). The issuer must support `authorization_code` with PKCE S256. Register a confidential client at the issuer with redirect URI `https://codepush.<domain>/auth/callback/sso`, and make sure the `api` container can reach `OIDC_ISSUER` for discovery. See [api/ENVIRONMENT.md](./api/ENVIRONMENT.md) for the full variable list.


## Contributing

Contributions are welcome. Please use [GitHub Issues](https://github.com/codemagic-ci-cd/code-push-server/issues) to report bugs, request features, or discuss changes before opening larger pull requests.


## Support

For support, usage questions, and community discussion, please open a [GitHub Issue](https://github.com/codemagic-ci-cd/code-push-server/issues).
