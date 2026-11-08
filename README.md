# @szluyu99/dsh-oneapi

DeepSeek Harness 插件：把 `@deepseek-ai/dsh-llm-pi-ai` 里的 `oneapi` provider 配置包成一个可视化面板 + 一组 agent 工具，省掉手改 profile 配置这一步。

> 这个插件最初是为百度内部的 OneAPI 网关（`https://oneapi-comate.baidu-int.com/v1`）写的，界面里的 Token 获取链接和占位符都指向那里。网关地址本身是可配置的，所以任何自建 OneAPI / One-API 兼容网关都能用——只是默认值和链接偏内部场景。

## 功能

### 设置页（设置 → OneAPI）

- 查看 provider 路由状态：displayName、api、baseURL、默认上下文窗口。
- 查看 API Key 是否已配置（只显示配置状态与来源，不回显明文）。
- 查看并切换 agent 默认模型。
- 查看完整模型清单：id、名称、上下文窗口、输入类型、推理等级。
- 编辑显示名、Base URL、API Key、默认模型，并可一键测试网关连通性。
- 逐模型连通性测试：表格里每行一个按钮，点一下发一次最小请求；表头「全部测试」用 4 个并发逐个跑，结果边跑边出。
- 「在左侧边栏显示」开关（配置项 `showInSidebar`，默认开）。

### 左侧边栏面板

开关打开时，DSH 左侧边栏会多一个 OneAPI 入口，面板内容与设置页一致，便于边对话边看模型状态。

### Agent 工具（6 个）

| 工具 | 作用 |
| --- | --- |
| `oneapi_status` | 读当前 provider 路由、API Key 配置状态、默认模型、模型清单 |
| `oneapi_test` | 请求 `{baseURL}/models`，返回 HTTP 状态、耗时、网关返回的模型 id 列表 |
| `oneapi_configure` | 改 displayName / baseURL / API Key / 默认模型 / `showInSidebar` |
| `oneapi_sync_models` | 从网关拉真实模型列表并写回配置（已知模型保留元数据） |
| `oneapi_test_models` | 对已配置的每个模型各发一次最小 chat-completion 探活（并发 5） |
| `oneapi_test_model` | 对单个模型做一次探活，返回 ok / status / latencyMs / error |

## 实现说明

- **不复制配置**：通过 host 的 `configEditor` seam 直接读写 `llm-pi-ai` 条目的 `providers.oneapi`，不另存一份。
- **API Key 走 `credentials`**：以凭据引用（默认 `ONEAPI_API_KEY`）存放，`set` / `describe` / `resolve`，不落明文配置。
- **默认模型走 `agentDefaultModel.saveSelection`**（provider 固定为 `oneapi`）。
- **HTTP API**：前端通过 `/api/oneapi/*` 访问 host 服务，路由为 `GET /status`、`POST /test`、`POST /save`、`POST /sync`、`POST /test-models`、`POST /test-model`。每个 handler 都做本机同源 + 请求围栏校验，所以从外部 `curl` 这些路由会返回 401——这是设计如此，不是故障。

## 安装

### 从 npm 安装

在 DSH 的插件管理里安装，target 填：

```
@szluyu99/dsh-oneapi
```

或者命令行 `npm install @szluyu99/dsh-oneapi`。

### 从 GitHub 安装

在 DSH 里用插件管理安装，target 填仓库地址：

```
github:szluyu99/dsh-oneapi
```

或者在 Web 界面的插件页用同样的 target 安装。

### 从源码安装（开发 / 本地改动）

```sh
git clone https://github.com/szluyu99/dsh-oneapi.git
```

然后用 DSH 的 `plugin_manager` → `install_bundle`，target 填 clone 下来的目录的**绝对路径**。pnpm 会 link 到源码目录，之后改源码即时生效。

### 装完之后

1. 刷新 Web 界面。
2. 进入「设置 → OneAPI」，填 Base URL 和 API Key，点测试连接。
3. 需要侧边栏入口的话，打开「在左侧边栏显示」。

## 开发备忘

改完代码后的重载规则不一样，记一下省得排查：

| 改了什么 | 怎么生效 |
| --- | --- |
| `index.js`（host 侧） | 插件开关 false → true |
| `client.js`（前端） | 浏览器刷新页面 |
| `package.json` / `cordis.patch.yml`（元信息） | 先卸载再安装 —— host 在**安装时**缓存了 `exports` 解析结果，只切开关不会刷新 |

## License

MIT
