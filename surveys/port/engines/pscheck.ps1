Get-Process sp -ErrorAction SilentlyContinue | ForEach-Object {
  "{0} cpu_min={1:N1} mem_MB={2:N0}" -f $_.Id, $_.TotalProcessorTime.TotalMinutes, ($_.WorkingSet64/1MB)
}
