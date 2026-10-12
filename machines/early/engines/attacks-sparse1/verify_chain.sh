#!/bin/bash
# Verify oracle F against every consecutive anchor pair in an anchors log.
# Usage: verify_chain.sh [logfile]   (default anchors_5e9.log)
A="C:/Users/Cyclingcycloid/.zcode/workspace/default/bb6/attacks-sparse1"
LOG="${1:-$A/anchors_5e9.log}"
awk '/^ANCH/{gsub(/[^0-9-]/," ",$0); print $1, $4, $5, $6}' "$LOG" > /tmp/anch.txt
ok=0; bad=0
ps=""; pm=""; pd=""; pk=""
while read -r s m d k; do
  if [ -n "$ps" ]; then
    cost=$((s - ps))
    out=$("$A/astart.exe" "$pm" "$pd" "$pk" 5000000000 terse)
    read -r r m2 d2 k2 c2 mr2 <<< "$out"
    if [ "$r" = "OK" ] && [ "$m2" = "$m" ] && [ "$k2" = "$k" ] && [ "$c2" = "$cost" ]; then
      ok=$((ok+1))
    else
      echo "MISMATCH $ps->$s: F($pm,$pd,$pk) -> oracle ($m2,$d2,$k2) cost=$c2 | real ($m,$d,$k) cost=$cost [$r]"
      bad=$((bad+1))
    fi
  fi
  ps=$s; pm=$m; pd=$d; pk=$k
done < /tmp/anch.txt
echo "VERIFIED ok=$ok bad=$bad (d not compared when k=0: representation only)"
