# 图片预览功能使用指南

## 功能概述

阶段一图片预览功能已实现，支持在 DirectoryPanel 中直接预览 agent 生成的图片文件。

## 新增功能

### 1. 图片文件 API (`/agent/image`)

**路由:** `GET /agent/image?path=<relative-path>`

**支持的图片格式:**
- PNG (`.png`)
- JPEG (`.jpg`, `.jpeg`)
- GIF (`.gif`)
- SVG (`.svg`)
- WebP (`.webp`)
- BMP (`.bmp`)
- ICO (`.ico`)

**限制:**
- 最大文件大小: 10MB
- 图片缓存: 1 小时 (`Cache-Control: max-age=3600`)

**示例:**
```
GET /agent/image?path=correlation_heatmap.png
```

### 2. DirectoryPanel 增强

**图片文件图标:**
- 图片文件在目录树中使用 `Image` 图标显示
- 其他文件继续使用 `FileText` 图标

**预览功能:**
1. 点击图片文件
2. 点击 "View" 按钮
3. 弹出模态框显示图片预览
4. 支持下载按钮

**预览界面:**
- 响应式图片显示 (最大高度 60vh)
- 居中对齐，保持宽高比
- 圆角阴影样式
- 加载失败自动显示错误信息

## 使用场景

### 场景 1: CSV 数据分析

1. 上传 CSV 文件到 agent 目录
2. Agent 运行 `csv-data-summarizer` skill
3. 生成的图片自动出现在目录树中:
   - `correlation_heatmap.png`
   - `time_series_analysis.png`
   - `distributions.png`
   - `categorical_distributions.png`
4. 点击任意图片文件 → 点击 "View" → 查看可视化结果

### 场景 2: 自定义可视化

如果你创建了生成图片的 skill:

```python
# 在 skill 脚本中生成图片
import matplotlib.pyplot as plt

plt.figure(figsize=(10, 6))
# ... 绘图代码
plt.savefig('my_chart.png', dpi=150)
```

生成的图片会自动显示在 DirectoryPanel，可直接预览。

## 技术细节

### 服务端实现

```typescript
// src/server/index.ts

// 图片扩展名集合
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico']);

// MIME 类型映射
const IMAGE_MIME_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  // ...
};

// 新增路由
if (pathname === '/agent/image' && request.method === 'GET') {
  // 验证路径安全性
  // 检查文件是否为图片
  // 返回图片流
}
```

### 前端实现

```tsx
// src/renderer/components/DirectoryPanel.tsx

// 图片预览状态
const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);

// 识别图片文件
function isImageFile(name: string): boolean {
  const extension = name.toLowerCase().split('.').pop() ?? '';
  return IMAGE_EXTENSIONS.has(extension);
}

// 预览处理
if (isImageFile(node.name)) {
  setImagePreview({ name: node.name, path: node.path });
}

// 模态框渲染
<img
  src={`/agent/image?path=${encodeURIComponent(imagePreview.path)}`}
  alt={imagePreview.name}
  className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-lg"
/>
```

## 测试步骤

1. 启动开发服务器:
   ```bash
   bun run dev:single
   ```

2. 准备测试数据:
   ```bash
   # 将 CSV 样例复制到 agent 目录
   cp agent/.claude/skills/csv-data-summarizer/resources/sample.csv agent/
   ```

3. 在 UI 中发送消息:
   ```
   请分析 sample.csv 文件
   ```

4. Agent 会自动运行 `csv-data-summarizer` skill 并生成图片

5. 在右侧 DirectoryPanel 中:
   - 找到生成的 PNG 文件 (带 Image 图标)
   - 点击文件名选中
   - 点击 "View" 按钮
   - 查看图片预览

## 后续计划

### 阶段二: 消息内图片内联 (计划中)

在 agent 回复消息中自动识别生成的图片路径，并内联显示:

```markdown
我已经生成了以下可视化图表:

![Correlation Heatmap](correlation_heatmap.png)
```

将自动转换为可预览的图片。

### 阶段三: HTML 交互式图表 (计划中)

支持 Plotly 生成的 HTML 交互式图表:

```python
import plotly.express as px
fig = px.scatter(df, x='date', y='revenue')
fig.write_html('interactive_chart.html')
```

使用 iframe 或 shadow DOM 安全渲染。

## 故障排查

### 图片无法加载

**问题:** 点击 "View" 后显示 "Failed to load image"

**可能原因:**
1. 文件路径不正确
2. 文件大小超过 10MB
3. 文件扩展名不在支持列表中

**解决方法:**
- 检查文件是否存在于 agent 目录
- 使用 "Download" 按钮下载文件验证
- 查看浏览器开发者工具 Network 面板

### 图片模糊或失真

**问题:** 图片显示质量差

**解决方法:**
- 在生成图片时提高 DPI:
  ```python
  plt.savefig('chart.png', dpi=300)  # 提高到 300 DPI
  ```

## 贡献指南

如果你想扩展此功能:

1. 添加新的图片格式支持:
   ```typescript
   // src/server/index.ts
   const IMAGE_EXTENSIONS = new Set([...existing, 'tiff', 'raw']);
   const IMAGE_MIME_TYPES = {...existing, tiff: 'image/tiff'};
   ```

2. 调整最大文件大小:
   ```typescript
   const maxSize = 20 * 1024 * 1024; // 改为 20MB
   ```

3. 自定义缓存策略:
   ```typescript
   headers: {
     'Cache-Control': 'max-age=7200'  // 2 小时缓存
   }
   ```
