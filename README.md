[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)

# Deploy your own Candy Machine easily
This repository is for Candy Machine V3, Account Version V2. (This is what you have when using the latest sugar version to create the candy machine)

Visible to the user:
![image](https://github.com/MarkSackerberg/umi-cmv3-ui-inofficial/assets/93528482/0ac70bda-5eee-4f6a-8035-ccf127fffc80)

Visible to the admin:
![image](https://github.com/MarkSackerberg/umi-cmv3-ui-inofficial/assets/93528482/560f29bd-3d25-411a-b099-9609820ca223)

## What does this repo support?
You can use this repo to deploy your own candy machine UI. 
- It supports multiple candy machine groups, but also just using a default group
- It creates a Lookup table for you to allow more active guards at the same time
- The initializer shows you the merkle root for your groups
- The users see NFTs left, start and end countdowns, reasons for not being able to mint and more
- It supports most of the existing guards
...

## Prerequisites
- [pnpm](https://pnpm.io/installation) as package manager - I used 8.1.0
- [sugar](https://docs.metaplex.com/developer-tools/sugar/guides/sugar-for-cmv3) to create your candy machine

## How to use
1. Clone this repo
2. Run `pnpm install`
3. copy the `.env.example` file to a new `.env` file and fill in the NEXT_PUBLIC_CANDY_MACHINE_ID value. You should have this value after creating your candy machine with sugar. 
3. Run `pnpm run dev`
4. Open your browser at `http://localhost:3000`
5. Connect your wallet which you used to create the candy machine
6. You should see a red `initialize` button. Click it and then click `create LUT`
7. Copy the LUT address that you see in the green success box and paste it into the `.env` file as the value for `NEXT_PUBLIC_CANDY_MACHINE_CONFIG`
8. Deploy your Candy Machine e.g. to Vercel or Cloudflare Pages
Done!

### customization
You can customize the UI by changing the code. If you just want to modify some values you can instead
- modify `settings.tsx` to change the texts and Image. 
  - `mintText` is for your candy Machine groups. e.g. if one of your groups is called `WL` you should have an entry for it in there, too.
  - `image` is the main image that is shown. You could change it to your project logo.
  - `headerText` is the website header. You could change it to your project name.

# Disclaimer
This is not an official project by the metaplex team. You can use that code at your own risk. I am not responsible for any losses that you might incur by using this code.

# Contact / Support
If you need help with this repo, you can contact me. Also feel free to create an issue or a pull request.
- [Discord](https://discordapp.com/users/marksackerberg)
- [Twitter](https://twitter.com/MarkSackerberg)

If you want to work together on projects let me know!

# Thank you!
Thanks to the metaplex team for creating NFTs on Solana, Candy Machine and Umi. Special Thanks to @lorisleiva for creating Umi and being so helpful. Also thanks to @tonyboylehub !