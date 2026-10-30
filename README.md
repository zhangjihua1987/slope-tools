# slope-tools

浏览器里的滑坡稳定性 Demo，实现 GB/T 38509-2020 **附录 A.1** 不平衡推力传递法（折线滑面）。拖动地面和滑面折线后，条块表和稳定系数 \(F_s\) 会立刻重算。构建结果是单个 HTML，不需要后端。

第一版不做附录 A.2，也不做正式 Excel / CAD 导出。

## 开发

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

`npm run build` 会先做类型检查，再用 `vite-plugin-singlefile` 把脚本和样式打进 `dist/index.html`。把这个文件拷出去，用浏览器直接打开即可，不依赖外网。

## 界面

- 左侧画布：绿线是地面，红线是滑面，灰线是竖向条分。拖拽顶点；双击边在中点插入顶点；选中顶点后按 Delete 删除（每条折线至少保留 2 个点）。坐标 x 向右、y 向上，单位为 m。
- 右侧参数：整坡统一的 \(c\)（kPa）、\(\varphi\)（°）、\(\gamma\)（kN/m³）。地震力和孔隙水压力默认关闭，此时 \(Q=V=U_b=0\)。外力 \(P\) 固定为 0。
- 下方成果：各条块的 \(\alpha\)、\(b\)、\(W\)、\(Q\)、\(V\)、\(U_b\)、\(R\)、\(T\)、\(\Psi\)、\(E\)，以及整坡 \(F_s\)。几何非法或迭代不收敛时给出红色提示，不显示 \(F_s\)。

默认坡面算得 \(F_s \approx 1.4644\)（\(c=16\,\mathrm{kPa}\)，\(\varphi=22^\circ\)，\(\gamma=19\,\mathrm{kN/m^3}\)，地震和水压力关闭）。

## 和 Excel 对算

1. 点「复制顶点坐标」或「下载顶点 CSV」。文件列为 `kind,index,x,y`，`kind` 为 `ground` 或 `slip`。
2. 把顶点按同样顺序填进已有的 Excel 条分表。滑面每两个相邻顶点之间对应一个竖条；面积按地面与滑面之间的多边形计算，\(\alpha\) 为该条滑面底边倾角，坡向右下时为正。
3. 可选「下载条块表 CSV」，其中第一行是本次 \(F_s\)，后面是条块量。
4. 对比 \(F_s\) 和各条 \(R\)、\(T\)、\(\Psi\)、\(E\)。\(E_n\) 在收敛后应接近 0。

计算约定（与计划中的 A.1–A.5 一致）：

\[
R_i=[(W_i+V_i)\cos\alpha_i-U_{bi}-Q_i\sin\alpha_i]\tan\varphi_i+c_i b_i\sec\alpha_i
\]
\[
T_i=(W_i+V_i)\sin\alpha_i+Q_i\cos\alpha_i
\]
\[
\Psi_i=\cos(\alpha_{i-1}-\alpha_i)-\sin(\alpha_{i-1}-\alpha_i)\tan\varphi_i/F_s
\]

\(F_s\) 用上式的隐式迭代，默认容差 \(10^{-4}\)、最多 50 次。首条没有传来的剩余推力，表中 \(\Psi_1=0\)。地震打开时 \(Q_i=\alpha_w a_i W_i\)、\(V_i=Q_i/3\)；水压力打开时 \(U_{bi}=(\text{waterRatio})\,W_i\)。

地面和滑面的 x 都必须严格递增，否则无法做竖向条分，界面会提示。`maxSlices` 只在滑面顶点之外额外均匀加密，不会删掉折点。
