# LIFF

LIFF SDK を使う際の規約。

## クライアント環境限定の API は `liff.isInClient` でガードする

`liff.closeWindow()` など LIFF ブラウザ(LINE アプリ内)でのみ動作する API は、外部ブラウザ(PC Chrome 等)では無反応になる。`liff.isInClient` で分岐し、外部ブラウザ向けには代替表示(例:「ブラウザのタブを閉じてください」)や代替動作を用意する。
