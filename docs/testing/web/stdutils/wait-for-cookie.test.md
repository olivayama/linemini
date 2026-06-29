# waitForCookie

- Cookie が既にあれば即座に resolve する
- ポーリング中に Cookie がセットされたら resolve する
- timeout 経過しても Cookie が無ければ諦めて resolve する
- 別名の Cookie だけがある場合は前方一致誤検知しない
