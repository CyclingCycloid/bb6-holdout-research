#!/bin/bash
# 分类一台机器: 输出 CODE, 末态, 各检查点 span 序列, 分类
CODE="$1"
STEPS=100000000
CP=20000000
OUT=$(cd /c/Users/Cyclingcycloid/.zcode/workspace/default/bb6/sim && timeout 120 ./tm.exe "$CODE" $STEPS $CP 2>/dev/null | tail -6)
STATUS=$(echo "$OUT" | tail -1 | awk '{print $1}')
SPANS=$(echo "$OUT" | awk '{for(i=1;i<=NF;i++) if($i~/^span=/) printf "%s ", substr($i,6)}')
RUNS=$(echo "$OUT" | tail -1 | awk '{for(i=1;i<=NF;i++) if($i~/^runs~/) print substr($i,6)}' | tr -d '\n')
echo -e "$CODE\t$STATUS\t$SPANS\tlastRuns=$RUNS"
