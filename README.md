This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Elwood Book Club

### Vote access password

Nomination rounds can optionally be protected with a **vote access password** to limit access to the vote page and reduce bot spam.

- **Admin:** When creating a round in the [Voting page builder](/admin/voting-builder), use the optional **Vote access password** field in the footer. Leave it blank for no password (anyone can view and vote); set a password to require it before viewing the round’s books and voting.
- **Voters:** On [/vote](/vote), if the current round has a password, a form is shown to enter the access password. After entering the correct password, an HttpOnly cookie is set for that round and the books/vote UI are shown. The cookie is scoped per round.

The password is stored in the database and checked server-side; the cookie is signed so it cannot be forged. No password is required for rounds created without one.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
