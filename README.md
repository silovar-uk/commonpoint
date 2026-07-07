# 共通点選手パーツ

浦和レッズ「初めて観戦ガイド」の `GAME` と `GOURMET & GOODS` の間に差し込む、埋め込み型コンポーネントのプレビューです。

GitHub Pages上では、前後のガイド文脈を薄く再現した確認画面として表示します。独立LPとしては使いません。

## できること

- 3つの入口カードを押すと、該当するフォームだけがアコーディオン展開する
  - 誕生日から探す
  - 出身地から探す
  - 世代から探す
- 誕生日：同じ月日 → 同じ月の順で検索
- 出身地：都道府県の完全一致で検索。ヒートマップ風の分布表示と都道府県選択を併用
- 世代：同じ生まれ年 → 前後1年 → 同じ年代の順で検索
- 結果は最大3人。4人以上は公式トップチーム一覧へ遷移
- 選手カードは公式プロフィールへ同じタブで遷移
- 誕生日に近いホームゲームは、公式データを投入するまで非表示
- 入力した誕生日・出身地・生まれ年は保存・送信しない

## ファイル構成

```text
index.html
  GitHub Pages用プレビュー。GAME → 共通点パーツ → GOURMET の文脈だけを再現

component/common-point.css
  埋め込みパーツとプレビューのスタイル

component/common-point.js
  状態管理、アコーディオン、検索、表示、軽量計測フック

data/players.js
  選手データ。シーズン中の加入・退団・背番号変更時に更新

data/matches.js
  誕生日近接試合用。未確認の試合情報は入れない
```

## 公式サイトへ組み込むとき

1. `component/common-point.css` をテーマ側で1回だけ読み込む
2. `component/common-point.js` を `defer` または `type="module"` で1回だけ読み込む
3. `index.html` 内の `.cp-guide-player` セクションだけを、ガイドの `GAME` と `GOURMET & GOODS` の間へ移す
4. `data/players.js` と `data/matches.js` を、公式情報に基づき更新する

各コンポーネントは `.js-common-point` ごとに初期化されるため、同じページに複数置いても状態が衝突しません。

## 公開前チェック

- `data/players.js` の生年月日・出身地・所属状況・公式プロフィールURLを全件確認
- `data/matches.js` は、公式日程・販売状態・遷移先を確認できた試合だけ追加
- 試合カードは `salesState: "on_sale"` のときだけチケットCTAを表示
- 選手写真を追加する場合は、クラブ承認済み素材だけを使用
- 375px幅のスマホ、Safari iOS、キーボード操作、モーション軽減設定を確認

## GitHub Pages

リポジトリの **Settings → Pages** で公開ソースを **GitHub Actions** に設定してください。

通常の公開先は `https://silovar-uk.github.io/commonpoint/` です。
