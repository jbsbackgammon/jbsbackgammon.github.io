# JBS 運営ツール ルートページ

`https://jbsbackgammon.github.io/` 用の静的サイトです。

## GitHub 側の初回設定

1. GitHub organization `jbsbackgammon` に **`jbsbackgammon.github.io`** という名前のリポジトリを作成します。
2. デフォルトブランチを `main` にします。
3. このZIPの中身を、フォルダ構成を保ったままリポジトリ直下へ配置します。
4. GitHub の **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にします。
5. `main` へ push すると `.github/workflows/pages.yml` が自動実行され、ルートページへ反映されます。

## 更新方法

`index.html`、`assets/style.css`、画像などを更新して `main` に push するだけで自動公開されます。

## GitHub Actions

Node.js 20 非推奨警告を避けるため、Node.js 24 対応の現行メジャーを利用しています。

- `actions/checkout@v7`
- `actions/configure-pages@v6`
- `actions/upload-pages-artifact@v5`
- `actions/deploy-pages@v5`
