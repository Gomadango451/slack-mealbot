# MealBot

Slackで `@MealBot` にメンションすると、ランチ/ディナー・ジャンルを選ぶだけでおすすめのお店を3件教えてくれるBotです。[Bolt for JavaScript](https://tools.slack.dev/bolt-js/)のスターターテンプレートをベースに、[ホットペッパーグルメAPI](https://webservice.recruit.co.jp/doc/hotpepper/reference.html)と[Google Places API (New)](https://developers.google.com/maps/documentation/places/web-service/overview)を組み合わせて店舗データを自動取得します。

## なぜ作ったか

- **外部APIを組み合わせた開発を一通りやってみたかった**。REST APIの認証・ページネーション・レート制限対応・複数データソースの名寄せ(重複排除)など、実際に手を動かして学ぶための題材として作りました
- **お店探しを、評価やお金の影響から離れてフラットにやりたかった**。Googleマップの検索結果は口コミの数や広告に左右されがちで、「本当に近くて条件に合うだけの店」を公平に見るのが意外と難しいと感じていました。MealBotは評価順・おすすめ順ではなく、条件(ランチ/ディナー・ジャンル)に合う店をランダムに3件提示するだけなので、たまたま口コミが少ない・広告を出していないお店にも同じ確率で光が当たります

## Setup

Before getting started, make sure you have a development workspace where you have permissions to install apps. If you don't have one setup, go ahead and [create one](https://slack.com/create).

### Developer Program

Join the [Slack Developer Program](https://api.slack.com/developer-program) for exclusive access to sandbox environments for building and testing your apps, tooling, and resources created to help you build and grow.

## Installation

<details><summary><strong>Using Slack CLI</strong></summary>

Install the latest version of the Slack CLI for your operating system:

- [Slack CLI for macOS & Linux](https://docs.slack.dev/tools/slack-cli/guides/installing-the-slack-cli-for-mac-and-linux/)
- [Slack CLI for Windows](https://docs.slack.dev/tools/slack-cli/guides/installing-the-slack-cli-for-windows/)

You'll also need to log in if this is your first time using the Slack CLI.

```sh
slack login
```

#### Initializing the project

```sh
slack create my-bolt-js-app --template slack-samples/bolt-js-starter-template
cd my-bolt-js-app
```

After cloning, you're all set to start developing!

</details>

<details><summary><strong>Using Terminal</strong></summary>

#### Create Your Slack App

1. Open [https://api.slack.com/apps/new](https://api.slack.com/apps/new) and choose "From an app manifest"
2. Choose the workspace you want to install the application to
3. Copy the contents of [manifest.json](./manifest.json) into the text box that says `*Paste your manifest code here*` (within the JSON tab) and click _Next_
4. Review the configuration and click _Create_
5. Click _Install to Workspace_ and _Allow_ on the screen that follows. You'll then be redirected to the App Configuration dashboard.

#### Environment Variables

Before you can run the app, you'll need to store some environment variables.

1. Rename `.env.sample` to `.env`
2. Open your apps configuration page from [this list](https://api.slack.com/apps), click _OAuth & Permissions_ in the left hand menu, then copy the _Bot User OAuth Token_ into your `.env` file under `SLACK_BOT_TOKEN`
3. Click _Basic Information_ from the left hand menu and follow the steps in the _App-Level Tokens_ section to create an app-level token with the `connections:write` scope. Copy that token into your `.env` as `SLACK_APP_TOKEN`.

#### Initializing the project

```sh
git clone https://github.com/slack-samples/bolt-js-starter-template.git my-bolt-js-app
cd my-bolt-js-app
```

#### Install dependencies

```sh
npm install
```

</details>

## Development

### Starting the app

#### Slack CLI

```sh
slack run
```

#### Terminal

```sh
npm start
```

### Linting

```zsh
# Run lint for code formatting and linting
npm run lint
```

### Testing

```zsh
# Run test for unit tests
npm test
```

## Project Structure

### `manifest.json`

`manifest.json` is a configuration for Slack apps. With a manifest, you can create an app with a pre-defined configuration, or adjust the configuration of an existing app.

### `app.js`

`app.js` is the entry point for the application and is the file you'll run to start the server. This project aims to keep this file as thin as possible, primarily using it as a way to route inbound requests.

### `/listeners`

Every incoming request is routed to a "listener". Inside this directory, we group each listener based on the Slack Platform feature used, so `/listeners/shortcuts` handles incoming [Shortcuts](https://docs.slack.dev/interactivity/implementing-shortcuts/) requests, `/listeners/views` handles [View submissions](https://api.slack.com/reference/interaction-payloads/views#view_submission) and so on.

## Lunch Recommendation Feature

Mention the bot in a designated channel (`@MealBot`, or whatever you've renamed it to), or actually @mention it inside a DM, to get 3 ephemeral (only-you-can-see) restaurant suggestions.

**The trigger is mention-only** — in the configured channel that's the normal `app_mention` event; in a DM it means the message must contain a real `<@BOTUSERID>` mention (pick the bot from Slack's `@` autocomplete), not just the word "lunch" typed as plain text. Plain DM messages that don't actually mention the bot are ignored.

### How it works

1. You're asked whether you want **🍽️ ランチ** or **🌙 ディナー**.
   - **ランチ** filters `data/restaurants.json` down to restaurants where `hasLunch` isn't explicitly `false` (i.e. known-lunch or unknown-lunch restaurants — only restaurants confirmed to have no lunch menu are excluded). **ディナー** has no filter and includes every restaurant, since almost every restaurant serves dinner and there's no "dinner" flag to check against.
2. You're then asked to pick a **ジャンル** from a dropdown built from whatever genres actually exist for that category (most common first), with **🎲 おまかせ(ジャンル問わず)** always available at the top if you don't want to narrow it down.
3. 3 candidates are shown, excluding restaurants recently suggested in that channel/DM. Not feeling it? Click **🔀 別の3件を見る** to reshuffle within the same ランチ/ディナー・ジャンル, or **🔄 ジャンルを変える** to go back and pick a different ジャンル (the ランチ/ディナー choice is kept).
4. Each candidate has 行った / 良かった / イマイチ buttons — feedback is recorded but not yet used to influence future picks.

### Setup

1. Add a `LUNCH_CHANNEL_ID` entry to your `.env` with the ID of the channel where the bot should respond to mentions (DMs work regardless of this setting).
2. This feature requires **Node.js 22.5+** (it uses the built-in `node:sqlite` module — no extra dependency to install).
3. History and feedback are stored in `data/lunch.db` (a local SQLite file, created automatically on first use and excluded from git).
4. Because this feature subscribes to the `app_mention` and `message.im` events and adds the `app_mentions:read` / `im:history` scopes, **you'll need to reinstall the app to your workspace** after applying the updated `manifest.json` for the new permissions to take effect. You'll also need **App Home → Messages Tab** enabled (`messages_tab_enabled: true` in the manifest) so users can actually open a DM with the bot.

### Adding restaurants

Edit `data/restaurants.json` — each entry is `{ "id", "name", "genre" }`, plus optional `"hasLunch"` (boolean), `"address"`, and `"sourceUrl"`. `id` must be unique. Restaurants without `"hasLunch"` set are treated as "unknown" and still shown for ランチ (only an explicit `false` excludes a restaurant). You can grow the list manually, or fetch it automatically (see below).

## Hot Pepper Gourmet API連携

`data/restaurants.json` を手入力する代わりに、[ホットペッパーグルメAPI](https://webservice.recruit.co.jp/doc/hotpepper/reference.html)から周辺の飲食店データを自動取得できます。**個人の非商用利用限定**の無料APIです。課金の発生する処理は一切含まれていません。

### セットアップ

1. [ホットペッパーグルメ Webサービス](https://webservice.recruit.co.jp/doc/hotpepper/register.html)でAPIキーを取得し、`.env` に `HOTPEPPER_API_KEY` として設定してください。
2. `manifest.json` を更新した場合と同様、`/meal-settings` `/meal-fetch` の2つのスラッシュコマンドを反映するため、Slack側でアプリの再インストールが必要です。

### 使い方

1. `/meal-settings` — モーダルで検索の中心地点(住所・地名)と検索半径(300m/500m/1000m/2000m/3000m)を設定します。住所は [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/)(無料・APIキー不要)で緯度経度に変換されます。設定はワークスペース単位で1件、`data/lunch.db` の `settings` テーブルに保存されます。
2. `/meal-fetch` — 設定した地点・半径でホットペッパーAPIを呼び出し、最大200件まで取得します(ページングは自動)。`GOOGLE_PLACES_API_KEY` も設定していれば、同じコマンドでGoogle Places分も同時に取得されます(後述)。取得したデータはまだファイルに保存されず、件数のサマリと共に「⚠️ 上書き保存」「➕ マージして保存」「キャンセル」の3択がエフェメラルで表示されます。
   - **上書き保存**: `data/restaurants.json` を取得結果で完全に置き換えます(手動登録データも含め、既存の内容は失われます)。確認ダイアログが出ます。
   - **マージして保存**: 既存データを残したまま、`id` が同じもの(再取得時の同一店舗)は新しい情報で更新し、新規店舗を追加します。
   - `HOTPEPPER_API_KEY` と `GOOGLE_PLACES_API_KEY` のどちらも未設定、または `/meal-settings` が未実行の場合は、その旨のエラーメッセージが返ります(どちらか一方だけ設定されていれば、そちらのソースのみ取得します)。

### ランチ判定について

営業時間の自由記述テキスト(`open`)をパースするのは表記ゆれが多く大変なため、ホットペッパーAPIが返す `lunch`(ランチメニューの有無、「あり」/空)という構造化フラグをそのまま使っています。`lunch: "あり"` の店だけが `hasLunch: true` になり、それ以外は `false`。手動登録などで `hasLunch` 自体が無い店は「不明」として扱われ、ランチの候補にも出ます(店が消えるより出過ぎる方が安全という判断です)。ディナーには対応するフラグが無いため、フィルタなしで全件が候補になります。

### クレジット表記・利用規約について

ホットペッパーグルメAPIの利用規約により、取得したデータを表示する際は "Powered by ホットペッパーグルメ Webサービス" のクレジット表記(`http://webservice.recruit.co.jp/` へのリンク付き)が必要です。この機能では、候補にホットペッパー由来の店舗が1件でも含まれる場合、メッセージ末尾に自動でクレジットを表示します。店舗情報の再販や、飲食店から対価を得るような商用利用は規約違反となるためご注意ください。詳細は[利用ガイドライン](https://webservice.recruit.co.jp/doc/hotpepper/guideline.html)を参照してください。

### Nominatimの利用について

住所のジオコーディングには [Nominatim](https://nominatim.openstreetmap.org/) の利用ポリシー(短時間に大量リクエストしない、識別可能な User-Agent を付与する等)を守ってください。この機能は `/meal-settings` 実行時に一度だけ呼び出す設計なので、通常利用で問題になることはありません。

## Google Places API連携

ホットペッパーグルメAPIには掲載されていない店(個人経営店など)を補うため、[Google Places API (New)](https://developers.google.com/maps/documentation/places/web-service/overview) も追加のデータソースとして使えます。`GOOGLE_PLACES_API_KEY`を設定すると、`/meal-fetch`(前セクション)が自動的にホットペッパーとGoogle Places の両方から取得し、同じ`data/restaurants.json`に統合します。

### セットアップ

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成し、**Places API (New)** を有効化してください。
2. **課金アカウント(クレジットカード)の登録が前提条件です。** 個人利用程度の呼び出し回数であれば無料枠(月10,000件など)に収まり実質無料ですが、支払い方法自体は登録する必要があります。この点を理解した上でご利用ください。
3. APIキーを発行し、`.env` に `GOOGLE_PLACES_API_KEY` として設定してください。

### 使い方

`/meal-fetch` を実行すると、`/meal-settings` で設定済みの検索地点・半径を使って、Google Places の Text Search (New) でも周辺の飲食店を取得し、ホットペッパー分と合わせて1つのサマリ・確認画面にまとめて表示されます。個別に呼び出すコマンドはありません。

### 制約

- Text Search (New) は1回の検索で**最大60件**までしか取得できません(1ページ20件 × 最大3ページ)。ホットペッパーの200件と違い、この上限は仕様上の固定値で回避できません。
- 位置の絞り込み(`locationBias`)は「その辺り」を示すヒントであり、範囲外の結果が混ざることがあるため、取得後に実際の距離を計算して半径外の店舗を除外しています。

### ホットペッパーとの重複について

同じ店が両方のデータソースに載っている場合、店名(表記ゆれを正規化した上で完全一致 or 部分一致)と、両方に座標があれば距離(100m以内)で同一店舗と判定し、「マージして保存」時に重複登録されないようにしています(`listeners/lib/restaurants.js`の`mergeRestaurants`)。店名がたまたま似ている別の店を誤って同一視する可能性はゼロではないので、変な統合をされていたら気づいたタイミングで`data/restaurants.json`を手直ししてください。

### 帰属表示・キャッシュについて

Google Places APIの利用規約により、データを表示する際は帰属表示が必要です(本来はGoogle Mapsロゴが推奨されますが、スペースが限られる場合はテキスト「Google Maps」表記で可とされています)。候補にGoogle Places由来の店舗が含まれる場合、メッセージ末尾に自動で表示します。また、`place_id`以外のコンテンツ(住所・ジャンル等)は無期限キャッシュが許可されていないため、`data/restaurants.json`を長期間更新せず使い続けるのではなく、定期的に`/meal-fetch`を再実行することをおすすめします。

## App Distribution / OAuth

Only implement OAuth if you plan to distribute your application across multiple workspaces. A separate `app-oauth.js` file can be found with relevant OAuth settings.

When using OAuth, Slack requires a public URL where it can send requests. In this template app, we've used [`ngrok`](https://ngrok.com/download). Checkout [this guide](https://ngrok.com/docs#getting-started-expose) for setting it up.

Start `ngrok` to access the app on an external network and create a redirect URL for OAuth.

```
ngrok http 3000
```

This output should include a forwarding address for `http` and `https` (we'll use `https`). It should look something like the following:

```
Forwarding   https://3cb89939.ngrok.io -> http://localhost:3000
```

Navigate to **OAuth & Permissions** in your app configuration and click **Add a Redirect URL**. The redirect URL should be set to your `ngrok` forwarding address with the `slack/oauth_redirect` path appended. For example:

```
https://3cb89939.ngrok.io/slack/oauth_redirect
```

## Make This Template a Code Assistant App

Take your exploration a step further and make this template an [AI app](https://tools.slack.dev/bolt-js/concepts/ai-apps) with the use of a [Hugging Face](https://huggingface.co) model. Follow [this tutorial](https://tools.slack.dev/bolt-js/tutorials/code-assistant) to find out how.
