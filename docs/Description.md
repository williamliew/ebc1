# Elwood Book Club

## Overview

Elwood Book Club is a book club based in Melbourne, Australia. The club is primarily run by a single administrator who manages all operations manually through Instagram and WhatsApp.

The book club is free to join with no subscriptions or fees required. It welcomes all ages and genders, and is generally regarded as a friendly, less serious book club compared to others.

## Current Setup

### Engagement Platforms

The club uses two main platforms for engagement:

- **Instagram**: Used for book suggestions, voting, announcements, and general exposure
- **WhatsApp**: Community group for member communication and event notifications. The group includes several channels:
    - **Announcements**: Admin-only posting channel
    - **Social**: General social channel
    - **Book chat**: Discussion channel for book-related conversations
    - **Pub trivia**: Channel for trivia engagement
    - **Cinema**: A special channel was created for last months "Book turned into a movie" group people to attend if they wanted

### Admin Profile

The administrator is not particularly tech-savvy but is comfortable using Instagram stories, polls, and votes, as well as managing WhatsApp communications.

## Monthly Book Selection Process

Each month, a book is selected through the following process:

1. **Open Suggestions**: The admin creates an Instagram story (or opens a suggestion round in the app) requesting book suggestions for the month.
2. **Member Submissions**: Followers respond with their book suggestions (members can suggest up to 2 books per round in the app, or via Instagram).
3. **Tally / Top 4**: The admin reviews suggestions (in the app: tally by book; on Instagram: manual count) and selects the top 2–4 books.
4. **Shortlist & Vote**: The admin uses the app’s **Voting page builder** to create a vote round with meeting date and close-vote date. The shortlist (with cached cover, title, author, blurb) is shown on the public **Vote** page.
5. **Final Vote**: Members vote once per round on the app (or via an Instagram poll). Votes are stored with a hashed identifier only (one vote per device/person per round).
6. **Winner**: After voting closes, the admin can set the winner in the app; the **Next book** view shows the winning book and meeting date.

The web app supports this flow with **suggestion rounds**, **vote rounds**, **cached shortlist data**, and **votes** stored in the database. For a step-by-step description of the flow (suggestions → vote → book of the month → question builder) (including that the “book of the month” is created manually by the admin), see **Flow.md**. For how the app functions (routes, voting builder, vote page, question builder, APIs), see **ebc1/README.md**. For build goals and data model, see **Instructions.md**.

## Event Management

Once a book is selected:

- The admin creates a public Eventbrite event with limited spaces
- Tickets are free but required to attend (though some regular members may attend without tickets)
- The event details are shared first on WhatsApp, prioritising existing members
- It is then broadcasted via Instagram story and/or post and Instagram page description updated with link to the event on Eventbrite
- The meetup takes place at a preselected pub, restaurant, or establishment where members chat and socialise about the book

## Instagram

- Currently has 47 posts
- Currently has 549 followers
