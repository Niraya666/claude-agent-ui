# 图表展示能力分析与交互式可视化改造方案

## 当前图表展示能力

### 现状总结

| 功能          | 当前状态  | 说明                           |
| ------------- | --------- | ------------------------------ |
| PNG 图片生成  | ✅ 支持   | Python matplotlib 生成静态图片 |
| 图片文件下载  | ✅ 支持   | `/agent/download?path=xxx.png` |
| 图片内联预览  | ❌ 不支持 | DirectoryPanel 只支持文本预览  |
| HTML 图表渲染 | ❌ 不支持 | 无 iframe/HTML 内嵌机制        |
| 交互式图表    | ❌ 不支持 | 无 Plotly/ECharts 集成         |

### 详细分析

#### 1. 文件预览 (`/agent/file` API)

**限制:**

- 仅支持文本文件 (`isPreviewableText()` 函数)
- 支持的扩展名: `txt`, `md`, `json`, `js`, `ts`, `py`, `html`, `css` 等
- **不支持**: `.png`, `.jpg`, `.svg`, `.html` (作为图表)
- 最大文件大小: 512KB

```typescript
// src/server/index.ts:101-111
function isPreviewableText(name: string, mimeType: string | undefined): boolean {
  if (mimeType?.startsWith('text/')) return true;
  if (['application/json', 'application/xml', 'application/x-yaml'].includes(mimeType)) return true;
  return TEXT_EXTENSIONS.has(extension);
}
```

#### 2. 附件预览 (`AttachmentPreviewList`)

- 支持图片缩略图预览 (`isImage && previewUrl`)
- 仅用于用户上传的附件，非 agent 生成的文件
- 图片通过 `previewUrl` (base64 或 blob URL) 显示

#### 3. CSV 分析脚本输出

`analyze.py` 生成以下静态 PNG 文件:

- `correlation_heatmap.png` - 相关性热力图
- `time_series_analysis.png` - 时序分析图
- `distributions.png` - 数值分布直方图
- `categorical_distributions.png` - 分类分布条形图

**问题:**

- PNG 文件保存在 agent 目录，但前端无法直接预览
- 用户需要手动下载或在外部查看

---

## 交互式可视化改造方案

### 方案对比

| 方案              | 工作量     | 优点                  | 缺点                    |
| ----------------- | ---------- | --------------------- | ----------------------- |
| A: 添加图片预览   | 小 (1-2天) | 改动小，快速见效      | 仍是静态图，无交互      |
| B: HTML 图表渲染  | 中 (3-5天) | 支持 Plotly HTML 导出 | 安全性考虑，iframe 隔离 |
| C: 前端图表库集成 | 大 (1-2周) | 完全交互式，最佳体验  | 需要数据协议，改动大    |

### 推荐方案: A + B 组合

#### 阶段一: 添加图片预览 (快速见效)

**改动点:**

1. 服务端: 添加 `/agent/image` 路由返回图片
2. 前端: `DirectoryPanel` 添加图片预览模态框
3. 前端: 在 agent 消息中识别并内联显示生成的图片

**估计工作量:** 1-2天

```typescript
// 新增路由示例
if (pathname === '/agent/image' && request.method === 'GET') {
  const file = Bun.file(resolvedPath);
  return new Response(file.stream(), {
    headers: { 'Content-Type': file.type }
  });
}
```

#### 阶段二: HTML 图表渲染 (中期)

**改动点:**

1. Python 脚本: 使用 Plotly 生成交互式 HTML
2. 服务端: 安全地提供 HTML 文件 (CSP 配置)
3. 前端: 添加 iframe 或 shadow DOM 渲染 HTML 图表

**估计工作量:** 3-5天

```python
# analyze.py 改用 Plotly
import plotly.express as px

fig = px.scatter(df, x='date', y='revenue', color='region')
fig.write_html('interactive_chart.html')
```

#### 阶段三: 前端图表库集成 (长期)

**改动点:**

1. 定义数据交换协议 (JSON schema)
2. Python 脚本返回结构化数据而非图片
3. 前端使用 ECharts/Recharts 渲染

**估计工作量:** 1-2周

```typescript
// 数据协议示例
interface ChartData {
  type: 'line' | 'bar' | 'scatter' | 'heatmap';
  title: string;
  data: { x: any[]; y: any[]; series?: string };
  options?: Record<string, any>;
}
```

---

## 实施建议

### 立即可做 (阶段一)

1. **添加图片预览 API**
   - 修改 `src/server/index.ts` 添加 `/agent/image` 路由
   - 支持 PNG/JPG/SVG 文件直接返回

2. **增强 DirectoryPanel**
   - 识别图片文件类型
   - 点击图片文件时显示预览模态框

3. **消息内图片显示**
   - 在 agent 回复中检测生成的图片文件路径
   - 自动内联显示图片

### 短期 (阶段二)

1. **升级 analyze.py 使用 Plotly**
   - 保留 matplotlib 作为后备
   - 生成 HTML 交互式图表

2. **安全的 HTML 渲染**
   - 使用 sandboxed iframe
   - 配置 CSP 策略

### 长期 (阶段三)

1. **前端图表组件**
   - 集成 ECharts 或 Recharts
   - 支持缩放、导出、工具提示

2. **数据分析增强**
   - 支持更多数据格式 (Excel, JSON)
   - 添加数据清洗和转换功能

---

## 具体实现代码示例

### 图片预览 API (阶段一)

```typescript
// src/server/index.ts 新增
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']);

if (pathname === '/agent/image' && request.method === 'GET') {
  const relativePath = url.searchParams.get('path') ?? '';
  const resolvedPath = resolveAgentPath(resolvedAgentDir, relativePath);
  const file = Bun.file(resolvedPath);

  if (!(await file.exists())) {
    return jsonResponse({ error: 'File not found.' }, 404);
  }

  const ext = resolvedPath.split('.').pop()?.toLowerCase() ?? '';
  if (!IMAGE_EXTENSIONS.has(ext)) {
    return jsonResponse({ error: 'Not an image file.' }, 415);
  }

  return new Response(file.stream(), {
    headers: {
      'Content-Type': file.type || `image/${ext}`,
      'Cache-Control': 'max-age=3600'
    }
  });
}
```

### DirectoryPanel 图片预览 (阶段一)

```tsx
// 在 DirectoryPanel.tsx 中
const isImageFile = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext ?? '');
};

// 预览模态框增加图片支持
{
  isImageFile(selectedNode?.name ?? '') && (
    <img
      src={`/agent/image?path=${encodeURIComponent(selectedNode.path)}`}
      alt={selectedNode.name}
      className="max-h-[70vh] max-w-full"
    />
  );
}
```

### Plotly HTML 图表 (阶段二)

```python
# analyze.py 使用 Plotly
import plotly.express as px
import plotly.graph_objects as go

def create_interactive_charts(df, output_dir='.'):
    charts = []

    # 数值分布
    numeric_cols = df.select_dtypes(include='number').columns
    for col in numeric_cols[:4]:
        fig = px.histogram(df, x=col, title=f'Distribution of {col}')
        path = f'{output_dir}/dist_{col}.html'
        fig.write_html(path, include_plotlyjs='cdn')
        charts.append(path)

    # 相关性热力图
    if len(numeric_cols) > 1:
        corr = df[numeric_cols].corr()
        fig = px.imshow(corr, text_auto=True, title='Correlation Heatmap')
        path = f'{output_dir}/correlation.html'
        fig.write_html(path, include_plotlyjs='cdn')
        charts.append(path)

    return charts
```

---

## 总结

| 改造内容                | 难度 | 工作量 | 优先级 |
| ----------------------- | ---- | ------ | ------ |
| 图片预览 API            | 低   | 0.5天  | P0     |
| DirectoryPanel 图片预览 | 低   | 0.5天  | P0     |
| 消息内图片内联          | 中   | 1天    | P1     |
| Plotly HTML 图表        | 中   | 2天    | P1     |
| iframe 安全渲染         | 中   | 1天    | P1     |
| 前端图表库集成          | 高   | 1周+   | P2     |

**建议从阶段一开始**，先让用户能看到生成的图片，快速获得反馈后再迭代。
