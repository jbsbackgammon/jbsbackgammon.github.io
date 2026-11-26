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

## 共通スタイル

`/common/ui.css` を直接読み込み、`body.jbsui.jbsui-tool-page` で共通フォント・文字色・白背景・ページ基盤を、`jbsui-grid jbsui-grid--3` で一覧のグリッドを直接適用します。配色、文字サイズ、角丸、罫線、余白、影、フォーカスリング等は common の変数を直接参照し、`assets/style.css` にはルートページ固有の配置とナビゲーションカードの構成のみを記述します。ロゴのサイズ、カードの高さ・省略表示、一覧の間隔・760pxでの1列化など、共通の編集UIとは用途が異なる指定のみ固有CSSに残します。ツール一覧の取得・ページタイトルの取得・並び順は従来どおり `assets/app.js` が担当します。

## GitHub Actions

Node.js 20 非推奨警告を避けるため、Node.js 24 対応の現行メジャーを利用しています。

- `actions/checkout@v7`
- `actions/configure-pages@v6`
- `actions/upload-pages-artifact@v5`
- `actions/deploy-pages@v5`
