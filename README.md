# Deploy your own Candy Machine easily
This repository is for Candy Machine V3, Account Version V2. (This is what you have when using the latest sugar version to create the candy machine)

## What does this repo support?
You can use this repo to deploy your own candy machine UI. It supports most of the existing guards
...

## Prerequisites
- [pnpm](https://pnpm.io/installation) as package manager - I used 8.1.0
- [sugar](https://docs.metaplex.com/developer-tools/sugar/guides/sugar-for-cmv3) to create your candy machine

## How to use
1. Clone this repo
2. Run `pnpm install`
3. copy the `./.env.example` to `./.env` and fill in the NEXT_PUBLIC_CANDY_MACHINE_ID value. You should have this value after creating your candy machine with sugar. 
3. Run `pnpm run dev`
4. Open your browser at `http://localhost:3000`
5. Connect your wallet which you used to create the candy machine
6. You should see a red `initialize` button. Click it and then click `create LUT`
7. Copy the LUT address that you see in the green success box and paste it into the `./.env` file as the value for `NEXT_PUBLIC_CANDY_MACHINE_CONFIG`
8. Deploy your Candy Machine e.g. to Vercel or Cloudflare Pages
Done!

### customization
You can customize the UI by changing the code. If you just want to modify some values you can instead
- modify `settings.tsx` to change the texts and Image. 
  - `mintText` is for your candy Machine groups. e.g. if one of your groups is called `WL` you should have an entry for it in there, too.
  - `image` is the main image that is shown. You could change it to your project logo.
  - `headerText` is the website header. You could change it to your project name.


# Thank you!
Thanks to the metaplex team for creating NFTs on Solana, Candy Machine and Umi. Special Thanks to @lorisleiva for creating Umi and being so helpful. Also thanks to @tonyboylehub !