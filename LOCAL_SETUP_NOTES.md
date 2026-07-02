# ローカル開発環境セットアップ手順（WSL2 / Ubuntu 想定）

このブランチ `setup/local-testyama` は、テンプレートのコードネームを `testyama` に置換済み。
別PCで再開する場合の手順とハマりどころをまとめる。

## 0. リポジトリ取得

```bash
git clone https://github.com/olivayama/linemini.git
cd linemini
git checkout setup/local-testyama
```

## 1. ツール導入

### asdf（Node / pnpm / Go のバージョン管理）
```bash
git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.14.1
printf '\n. "$HOME/.asdf/asdf.sh"\n. "$HOME/.asdf/completions/asdf.bash"\n' >> ~/.bashrc
source ~/.bashrc
asdf plugin add nodejs
asdf plugin add pnpm
asdf plugin add golang
asdf install            # .tool-versions に従い Node 20.17.0 / pnpm 9.8.0 を導入
asdf install golang latest && asdf global golang latest
```

### protoc-gen-doc（proto ドキュメント生成用。Go 導入後）
```bash
go install github.com/pseudomuto/protoc-gen-doc/cmd/protoc-gen-doc@latest
asdf reshim golang      # ~/.asdf/shims に protoc-gen-doc を公開
```

### apt 系（要 sudo）
```bash
sudo apt-get update
sudo apt-get install -y make clang-format netcat-openbsd libnss3-tools
```

### mkcert（ローカル HTTPS 証明書。~/.local/bin に配置）
```bash
mkdir -p ~/.local/bin
curl -fsSL -o ~/.local/bin/mkcert "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x ~/.local/bin/mkcert
grep -q '.local/bin' ~/.bashrc || echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Docker Engine（WSL 内に導入する場合）
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo tee /etc/wsl.conf > /dev/null <<'EOF'
[boot]
systemd=true
EOF
```
→ Windows 側 PowerShell で `wsl --shutdown` 後、WSL を開き直す（グループ反映 + systemd 有効化）。

## 2. セットアップ

```bash
make setup       # pnpm i + localhost 証明書発行
```
- **`mkcert -install` は CA をシステム信頼ストアに登録するため sudo が必要**。
  `make setup` の途中で失敗したら、`mkcert -install`（sudo パスワード入力）を手動実行してから `make setup` を再実行する。

## 3. 起動 + DB 準備

```bash
make up          # docker compose up --watch --build（フォアグラウンドで動き続ける）
```
別ターミナルで：
```bash
make db/create   # testyama データベースを作成（@RequireOnce）
make db/mig/up   # マイグレーション適用
```
- **`make up` だけでは DB が無く API が `Unknown database 'testyama'` で落ちる。** db/create + db/mig/up が必須。
- `CODE_NAME` を変えた場合は `make down && make up` で再起動が必要（compose が起動時に env へ焼き込むため）。

アクセス先：
- Mini App: https://localhost/mini
- 管理画面: https://localhost/admin （初期ログイン: `d@opt.ne.jp` / `d@opt.ne.jp`）
- API: http://localhost:4000

## 4. LINE ログインの注意（400 Bad Request の原因）

- LIFF チャネル `tmp-localhost`（channelID `2001316806-PRr3VeXl`、エンドポイント `https://localhost/mini`）を使用。
- チャネルが **「開発中(Developing)」** の間は、**権限設定(Tester/Member/Admin)に登録された LINE アカウントのみログイン可**。
  ID/パスワード入力後に 400 になる場合は、ログインに使う LINE アカウントを権限設定に追加する（または公開する）。

## 5. その他

- 会社 PC では **Netskope** が `make up` の通信を妨げることがある（README のトラブルシューティング参照）。
- コード生成: `make gen`（proto / DB 型 / ドキュメント）。DB スキーマ変更後は `make gen/db`(TS型) / `make gen/doc/db`(tbls) が自動生成される。
- マイグレーション新規作成: `make db/mig/create NAME=xxx` は**空のひな形**を作るだけ。SQL は手書き（goose はスキーマ差分の自動生成はしない）。
