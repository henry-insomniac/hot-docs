#!/bin/bash
# render-all.sh
# 批量渲染所有 Graphviz .dot 文件

set -e

# 默认输出格式为 PNG
FORMAT=${1:-png}

# 支持的格式
SUPPORTED_FORMATS=("png" "svg" "pdf" "jpg")

# 检查格式是否支持
if [[ ! " ${SUPPORTED_FORMATS[@]} " =~ " ${FORMAT} " ]]; then
    echo "❌ 不支持的格式: $FORMAT"
    echo "支持的格式: ${SUPPORTED_FORMATS[*]}"
    exit 1
fi

# 检查 Graphviz 是否安装
if ! command -v dot &> /dev/null; then
    echo "❌ 错误：Graphviz 未安装"
    echo ""
    echo "安装方法："
    echo "  macOS:    brew install graphviz"
    echo "  Ubuntu:   sudo apt-get install graphviz"
    echo "  Windows:  choco install graphviz"
    exit 1
fi

echo "🎨 开始渲染 Graphviz 图表..."
echo "格式: $FORMAT"
echo "================================================"

# 计数器
total=0
success=0
failed=0

# 遍历所有 .dot 文件
for dot_file in *.dot; do
    if [ -f "$dot_file" ]; then
        total=$((total + 1))
        output_file="${dot_file%.dot}.$FORMAT"

        echo -n "  渲染 $dot_file -> $output_file ... "

        if dot -T"$FORMAT" "$dot_file" -o "$output_file" 2>/dev/null; then
            echo "✓"
            success=$((success + 1))
        else
            echo "✗"
            failed=$((failed + 1))
        fi
    fi
done

echo "================================================"
echo "渲染完成！"
echo "  总计: $total"
echo "  成功: $success"
echo "  失败: $failed"

if [ $failed -gt 0 ]; then
    exit 1
fi
