# Chapter 2: Four Tasks Only — and the 15 Hours Come Back

## The problem

You opened the tool. You typed a question. You got a long answer. You felt productive. You closed the tool. Two days later you were doing the same job the same old way.

That is not a personal failure. It is a pattern, and it repeats for three reasons:

**One: you use the tool like a search engine.** You ask a general question and get a general answer. A general answer is useless for a job whose details live in your head, not in the tool.

**Two: you measure by feeling, not time.** You say "that felt faster" and you have no idea whether it saved five minutes or cost you five.

**Three: you never reuse the prompt.** Every time you rewrite the instruction differently, the output differs, you lose trust in it, and you drift back to the old way.

The fix is not a better tool. The fix is a **system**: four specific tasks, one fixed prompt each, and one number you measure.

## The method: pick four tasks, and pick them with a filter

Not every hour of the 26 from Chapter 1 can be recovered. Some tasks cost you more time with AI than without it. That is why the filter matters more than the enthusiasm.

### The three-condition filter

A task deserves an AI system if:

1. **It repeats at least three times a week.** Once a month means don't bother.
2. **It takes 15 minutes or more per run.** Less than that and the gain is invisible.
3. **The cost of being wrong is low.** A bad listing draft is fixed in a minute. A wrong formal offer is fixed with your reputation. Never hand the tool something you are accountable for.

With that filter, four tasks alone capture about **80% of the recoverable time**:

| Task | Before | After | Weekly gain |
|---|---|---|---|
| Listing description | 40 min | 8 min | 3.2 hrs |
| First reply to an inquiry | 6 min | 90 sec | 4 hrs |
| Follow-up to a past client | 15 min | 3 min | 2.4 hrs |
| Offer sheet / brochure | 2 hrs | 25 min | 1.6 hrs |

That is **~11 hours** from four tasks. Add photo ordering and scheduling and you reach 15.

### Two rules that protect those numbers

**The 30-minute rule:** don't add a new AI task unless it saves you at least 30 minutes a week. Every time you think "let me try this too", ask whether it clears 30 minutes. If not, it's a hobby.

**The 10% rule:** for the first month, spend 10% of the old task time on review. If a description took 40 minutes, budget 8 minutes of draft plus 4 minutes of editing. The goal is not "zero minutes" — the goal is the same quality in less time with more control.

### What a prompt that works actually looks like

Most people write one line and wonder why the output is average. A real prompt has five parts:

1. **Role:** who the tool is. "You are a real-estate copywriter for the Egyptian market" — not "you are a smart assistant".
2. **Context:** the unit, the client, the market. The tool knows nothing about your street.
3. **Constraints:** length, tone, banned words, banned numbers.
4. **Format:** exactly what you want at the end — three headlines? a table? a WhatsApp message?
5. **Standard:** how you will judge it. "Every line must carry information; cut any line that doesn't."

If one of the five is missing, the output is missing something. This is the single most important skill in the book, and it is not technical: it is knowing how to describe your own job.

## Task one: the listing description

### Why start here

Because it repeats, it always takes the same time, and you see the result within a minute. A quick first win builds trust in the whole system. Start with "market analysis" and you will quit before you see any benefit.

### The ready prompt

> You are a professional real-estate copywriter working in the Egyptian market, writing for a real buyer looking for a home, not for an investor scanning a chart.
>
> Unit data:
> - Type and size: [apartment, 1,400 sq ft]
> - Location: [community / street / floor]
> - Rooms and baths: [3 bedrooms / 2 baths]
> - Condition: [fully finished, move-in ready]
> - Three nearest amenities: [school / mall / main road] with minutes from the gate
> - Price: [4.2M] and terms: [down payment 1.2M / 25k monthly]
> - Best fit: [first-home family / investor]
>
> Deliver: a 150-word description in simple, plain English, opening with the strongest feature and putting the price and down payment in the last two lines.
>
> Rules: short sentences; no "stunning", no "once in a lifetime", no "serious buyers only"; no number or feature that is not listed above; no claims about the neighbourhood you cannot verify.
>
> Also: three short ad headlines, and three questions the buyer will likely ask with a short answer to each.

### Before / after

**Before:** "Beautiful 1,400 sq ft apartment in a great location, close to everything, priced to sell. Serious buyers only."

**After:** "1,400 sq ft, three bedrooms, two baths, fully finished, third floor with an open view. Four minutes from the school and the main road is right outside the gate. Move-in ready, no finishing costs on top. Built for a first-home family that wants to settle, not renovate. Price 4.2M, down payment 1.2M, 25k monthly."

The difference is not that the second sounds nicer. The difference is that the first contained **no information**, while the second makes the buyer ask the right question instead of scrolling past.

### Mistakes that repeat in descriptions

| Mistake | Why it fails | What to do |
|---|---|---|
| "Close to everything" | Not information, not verifiable | "4 minutes from the school, 7 from the mall" |
| "Once in a lifetime" | Everyone writes it, so it means nothing | A real reason: "last unit on the floor with this view" |
| "Serious buyers only" | Pushes people away before they ask | Delete it |
| Price in the first line | They stop reading before the best feature | Price last |
| No down payment or monthly | The buyer's biggest question goes unanswered | Include them if you have the numbers |

## Task two: the first reply to an inquiry

This is where your day leaks fastest. The buyer asks "still available?" and you answer three hours later with "yes".

A good reply is not longer. A good reply **closes two gaps**: the missing information on their side, and the missing next step on yours.

### The ready prompt

> You are my assistant for replying to unit inquiries on WhatsApp. I will send you the client's message; give me three versions:
> 1. **Quick reply** (two lines): confirms the fact and asks exactly one question.
> 2. **Full reply** (six lines): answers what they asked, adds the strongest feature, states price and down payment, ends with a closing question.
> 3. **Silence reply**: a short follow-up for two days later that greets them and adds new information — it never asks "are you still interested?".
>
> Unit data: [paste the description]. Client data: [what you know]. Tone: plain, polite, not stiff.
>
> Banned: promises, any number that is not in the data, and "you'll definitely love it".

The real benefit is not only speed — it is **consistent quality**. Your reply no longer depends on your mood at 11pm.

## Task three: the follow-up message

Follow-up is money left on the table. Most deals close after several touches, and you usually make one or two and forget.

This chapter is not about building the habit — that comes later. It is about **what you write**.

"Still interested?" puts the client in a position where the easy answer is "no". A message that adds something new gets a reply.

### The ready prompt

> Write a WhatsApp follow-up for a client who viewed [unit] [n] days ago and objected to [price / distance / financing]. Maximum four lines, no "still interested?", no pressure.
>
> The message must contain one of: a new fact about the unit, a cheaper alternative in the same area, a change in the payment plan, or an answer to their original objection.
>
> Give me three versions: neutral, warm, and a two-line short one.

## Task four: the offer sheet and brochure

This is the task people procrastinate on because it is heavy: images, data, copy, layout. AI shortens the writing and structuring; the design stays with you or with a template.

The trick is not to ask for "a brochure" — broad requests return generic text. Ask for the **structure**: cover line, three features, spec table, payment plan, next step. Then you drop the images into the template.

## Your first week: a seven-day plan

I don't want you to run all four tasks tomorrow. One per day, and measure.

| Day | Task | Time | Success signal |
|---|---|---|---|
| Sat | One listing description | 20 min | 8 min draft + 4 min edit |
| Sun | Replies to five inquiries | 20 min | Three sent with no edits |
| Mon | Three follow-ups | 15 min | One reply comes back |
| Tue | A brochure outline | 25 min | Outline you actually like |
| Wed | Measure: minutes saved | 10 min | A number written down |
| Thu | Fix one weak prompt | 15 min | All five parts present |
| Fri | Decide the fifth task, if any | 10 min | A written decision |

## Chapter exercise (15 minutes)

1. Pick one listing you have right now.
2. Write its description with the prompt above.
3. Compare it with the old one.
4. Time both — and count the questions each version produced.

The fourth number is the surprise: a clear description reduces questions, and that saves more time than the writing itself.

## Chapter line

> You don't need to know everything about AI. You need four prompts that work, and to start with them tomorrow morning.
