"""A plain-language guide to a civil case in Kenya, step by step, for the public assistant.

General information about procedure under the Civil Procedure Act (Cap. 21) and the
Civil Procedure Rules, 2010. It is not advice on any person's case. Firms can replace
any step with their own reviewed wording by publishing it in the knowledge base
(see the seed_public_legal_guides command).
"""

GUIDE_TITLE = "Steps in a civil case in Kenya"
DISCLAIMER = (
    "This is general information about how civil cases usually run in Kenya. Time limits and requirements "
    "can differ with the court and the facts, so confirm your position with an advocate."
)

STEPS = [
    {
        "number": 1,
        "key": "advice",
        "title": "Get advice and gather your documents",
        "aliases": ("advice", "gather documents", "evidence i need", "limitation", "time limit to sue", "time bar", "prepare my case"),
        "summary": "An advocate assesses whether you have a claim, whether it is still in time, and what evidence you need.",
        "sections": [
            ("What happens", [
                "You explain what happened, who was involved and what you want (payment, an order, compensation).",
                "The advocate checks whether the law gives you a claim, against whom, and whether it is still within time.",
                "Before acting, the firm checks for conflicts of interest, takes your identification and gives you an engagement letter.",
            ]),
            ("Time limits (limitation)", [
                "Claims must be brought within the periods in the Limitation of Actions Act (Cap. 22): generally 6 years for a claim on a contract and 3 years for most injury (tort) claims, with longer periods for land.",
                "Once the period passes, the claim is usually lost, so seek advice early.",
            ]),
            ("What you should bring", [
                "Contracts, invoices, receipts, delivery notes, letters, emails, messages and photographs.",
                "Names and contacts of witnesses.",
                "A short written timeline of what happened, with dates.",
            ]),
        ],
    },
    {
        "number": 2,
        "key": "demand",
        "title": "Send a demand letter",
        "aliases": ("demand letter", "demand notice", "letter of demand", "notice before suing", "notice of intention to sue"),
        "summary": "Your advocate writes to the other side demanding payment or action within a set time before going to court.",
        "sections": [
            ("What happens", [
                "The advocate writes to the other party setting out the claim and giving a deadline, commonly 7 to 14 days, to pay or respond.",
                "Many disputes settle at this stage. A demand also shows the court that you gave the other side a chance before suing, which can matter when costs are decided.",
            ]),
            ("Special notices", [
                "Before suing the Government, a written notice of at least 30 days is required under the Government Proceedings Act.",
                "Some contracts and statutes require other notices or mediation first; your advocate will check.",
            ]),
            ("What you do", [
                "Tell your advocate immediately if the other side contacts you, pays anything or makes an offer.",
            ]),
        ],
    },
    {
        "number": 3,
        "key": "court",
        "title": "Choose the right court",
        "aliases": ("which court", "right court", "small claims", "magistrate court", "high court", "jurisdiction", "pecuniary"),
        "summary": "The claim must be filed in a court with power over its subject and value, in the right area.",
        "sections": [
            ("Value of the claim", [
                "Small Claims Court: claims of up to KES 1,000,000. Procedure is simpler and parties may appear without an advocate.",
                "Magistrates' Courts: up to KES 20,000,000 before a Chief Magistrate, with lower limits for junior magistrates (Magistrates' Courts Act, 2015).",
                "High Court: claims above the magistrates' limits and certain matters reserved to it.",
            ]),
            ("Type of dispute", [
                "Land and environment disputes go to the Environment and Land Court or courts with that jurisdiction.",
                "Employment disputes go to the Employment and Labour Relations Court or designated magistrates.",
            ]),
            ("Place", [
                "Usually where the defendant lives or works, or where the cause of action arose (section 15, Civil Procedure Act).",
            ]),
        ],
    },
    {
        "number": 4,
        "key": "filing",
        "title": "Prepare and file the case",
        "aliases": ("file a case", "filing", "plaint", "e-filing", "efiling", "court fees", "open a case in court", "file the case"),
        "summary": "The advocate drafts the plaint and supporting documents and files them through the Judiciary e-filing system.",
        "sections": [
            ("Documents filed", [
                "Plaint: the formal statement of your claim and the orders you ask for (Order 4, Civil Procedure Rules).",
                "Verifying affidavit: you confirm on oath that the plaint is correct.",
                "List of witnesses, their written statements, and a list and copies of the documents you will rely on (Order 3).",
            ]),
            ("How filing works", [
                "Documents are uploaded on the Judiciary e-filing portal. The system assesses the court fees, which are paid by M-Pesa or bank.",
                "Once paid, the case receives its official court number.",
            ]),
            ("What you do", [
                "Read the plaint and your witness statement carefully before signing. They must be true and complete.",
                "Pay the court fees and deposit your advocate asks for.",
            ]),
        ],
    },
    {
        "number": 5,
        "key": "service",
        "title": "Summons and service on the defendant",
        "aliases": ("service", "serve", "summons", "process server", "substituted service", "affidavit of service"),
        "summary": "The court issues summons, which must be delivered to the defendant with the plaint.",
        "sections": [
            ("What happens", [
                "The court issues summons to enter appearance (Order 5).",
                "The summons must be collected and served within 30 days of issue. It stays valid for 12 months and can be extended by the court.",
                "A court process server usually delivers the summons and plaint to the defendant personally.",
            ]),
            ("If the defendant cannot be found", [
                "The court can allow substituted service, for example by newspaper advertisement, email or another method it directs (Order 5 rule 17).",
            ]),
            ("Proof", [
                "The process server swears an affidavit of service describing how, when and where service was done. Later steps depend on it.",
            ]),
        ],
    },
    {
        "number": 6,
        "key": "response",
        "title": "Appearance and defence",
        "aliases": ("appearance", "memorandum of appearance", "defence", "defense", "reply to defence", "counterclaim", "respond to a case", "i have been sued"),
        "summary": "The defendant enters appearance and files a defence within set times; the plaintiff may reply.",
        "sections": [
            ("Time limits", [
                "Appearance: within the time stated in the summons, ordinarily 15 days from service (Order 6).",
                "Defence: within 14 days after appearance (Order 7 rule 1).",
                "The plaintiff may file a reply to the defence, usually within 14 days of being served with it.",
            ]),
            ("Counterclaim", [
                "A defendant who has a claim against the plaintiff can include it as a counterclaim with the defence.",
            ]),
            ("If you have been sued", [
                "Take the summons to an advocate immediately. Missing these time limits can lead to judgment against you without a hearing.",
            ]),
        ],
    },
    {
        "number": 7,
        "key": "default",
        "title": "Default judgment (if the defendant does not respond)",
        "aliases": ("default judgment", "judgment in default", "interlocutory judgment", "formal proof", "did not respond", "no defence", "set aside"),
        "summary": "If the defendant does not appear or defend in time, judgment can be entered without a full trial.",
        "sections": [
            ("Liquidated claims", [
                "For a fixed sum of money (a liquidated demand), final judgment can be entered on request (Order 10; section 25, Civil Procedure Act).",
            ]),
            ("Other claims", [
                "For damages or other relief whose amount must be assessed, interlocutory judgment is entered and the court then hears evidence to decide the amount (formal proof).",
            ]),
            ("Setting aside", [
                "A defendant can apply to set aside a default judgment, for example where service was not proper or there is a genuine defence (Order 10 rule 11).",
            ]),
        ],
    },
    {
        "number": 8,
        "key": "pretrial",
        "title": "Pre-trial and case management",
        "aliases": ("pre-trial", "pretrial", "case conference", "case management", "order 11", "mention", "directions", "mediation", "court-annexed mediation"),
        "summary": "After pleadings close, the court checks that both sides are ready, may refer the case to mediation, and fixes the hearing.",
        "sections": [
            ("What happens", [
                "Within about 30 days after pleadings close, the parties attend a case conference (Order 11).",
                "The court confirms that witness statements, lists and copies of documents have been filed and exchanged, and agrees the issues to be decided.",
                "Short sittings called mentions are used to check progress and give dates. No evidence is taken at a mention.",
            ]),
            ("Mediation", [
                "The court may refer the case to court-annexed mediation (section 59B, Civil Procedure Act). A mediator helps the parties negotiate; what is said is confidential.",
                "A settlement reached in mediation is recorded and becomes binding like a judgment.",
            ]),
            ("What you do", [
                "Give your advocate clear instructions on whether and on what terms you would settle.",
            ]),
        ],
    },
    {
        "number": 9,
        "key": "applications",
        "title": "Applications along the way",
        "aliases": ("injunction", "application", "summary judgment", "strike out", "interlocutory", "stay", "urgent order"),
        "summary": "Either side can ask the court for orders before the trial, such as an injunction or summary judgment.",
        "sections": [
            ("Common applications", [
                "Injunction to stop something happening until the case is decided (Order 40).",
                "Summary judgment where the defence raises no real issue (Order 36).",
                "Striking out a pleading that discloses no reasonable cause of action or defence (Order 2 rule 15).",
            ]),
            ("How they are decided", [
                "Usually on affidavits and arguments, not oral evidence. The court gives a ruling.",
                "Urgent applications can be heard quickly, sometimes before the other side is heard, with a full hearing soon after.",
            ]),
        ],
    },
    {
        "number": 10,
        "key": "hearing",
        "title": "The hearing (trial)",
        "aliases": ("hearing", "trial", "testify", "give evidence", "witness", "cross-examination", "cross examination", "examination in chief", "burden of proof"),
        "summary": "Witnesses give evidence on oath, are questioned by both sides, and documents are produced as exhibits.",
        "sections": [
            ("Order of the trial", [
                "The plaintiff's case is heard first, then the defendant's.",
                "Each witness takes an oath or affirms, adopts their witness statement, and is questioned by their own advocate (examination-in-chief).",
                "The other side then questions the witness (cross-examination), and their advocate may clarify points (re-examination).",
            ]),
            ("Proof", [
                "The person who asserts a fact must prove it (section 107, Evidence Act). In civil cases the standard is the balance of probabilities.",
            ]),
            ("If you are a witness", [
                "Tell the truth. Listen to each question and answer only that question.",
                "If you do not know or do not remember, say so. Do not guess.",
                "Bring your identification and the originals of your documents. Address a magistrate as \"Your Honour\" and a judge as \"My Lord\" or \"My Lady\".",
            ]),
            ("Adjournments", [
                "Adjournments are granted only for good reason, and a case not pursued can be dismissed for want of prosecution (Order 17).",
            ]),
        ],
    },
    {
        "number": 11,
        "key": "submissions",
        "title": "Submissions",
        "aliases": ("submissions", "written submissions", "closing arguments", "final arguments"),
        "summary": "After the evidence, each side argues the case on the facts and the law, usually in writing.",
        "sections": [
            ("What happens", [
                "The court gives dates for each side to file and serve written submissions, then may allow them to be highlighted briefly.",
                "Submissions explain why the evidence and the law support the orders sought, with the authorities relied on.",
            ]),
        ],
    },
    {
        "number": 12,
        "key": "judgment",
        "title": "Judgment",
        "aliases": ("judgment", "judgement", "verdict", "decision", "ruling", "outcome of the case"),
        "summary": "The court delivers its decision on a date it announces.",
        "sections": [
            ("What happens", [
                "The court fixes a date and delivers judgment. The rules expect judgment within 60 days after the hearing closes (Order 21).",
                "The judgment states who succeeds, what is awarded, interest and who pays the costs.",
            ]),
            ("After judgment", [
                "If the decision is against you, your advocate can apply immediately for a stay of execution while an appeal is considered (Order 42 rule 6).",
                "Ask for a copy of the judgment so the next steps can be planned.",
            ]),
        ],
    },
    {
        "number": 13,
        "key": "decree",
        "title": "Decree and costs",
        "aliases": ("decree", "costs", "bill of costs", "taxation", "certificate of costs", "interest"),
        "summary": "The judgment is turned into a formal decree, and the legal costs are assessed.",
        "sections": [
            ("Decree", [
                "A decree is the formal order drawn from the judgment. It is what gets enforced (Order 21).",
            ]),
            ("Costs", [
                "The successful party usually recovers part of their legal costs from the other side.",
                "The advocate files a bill of costs, and a taxing officer assesses it under the Advocates (Remuneration) Order. The result is a certificate of costs.",
                "Interest may be awarded on the amount decreed (section 26, Civil Procedure Act).",
            ]),
        ],
    },
    {
        "number": 14,
        "key": "execution",
        "title": "Execution: enforcing the judgment",
        "aliases": ("execution", "enforce", "enforcement", "auctioneer", "attachment", "warrant", "garnishee", "not paying", "hasn't paid", "recover the money", "collect the money"),
        "summary": "If the other side does not pay or comply, the court can enforce the decree.",
        "sections": [
            ("Ways to enforce", [
                "Attachment and sale of the debtor's property by licensed auctioneers under a court warrant (Order 22).",
                "Garnishee orders directing a bank or someone who owes the debtor money to pay it to you instead (Order 23).",
                "Other measures the court may order, depending on the decree.",
            ]),
            ("Things to know", [
                "Where a decree is more than a year old, the court usually requires the debtor to be given notice to show cause first.",
                "The debtor can apply for a stay, for example pending an appeal. The court may impose conditions such as security.",
            ]),
        ],
    },
    {
        "number": 15,
        "key": "appeal",
        "title": "Appeal or review",
        "aliases": ("appeal", "review", "court of appeal", "challenge the decision", "unhappy with the judgment"),
        "summary": "A party who disagrees with the decision can appeal to a higher court, or ask the same court to review it.",
        "sections": [
            ("Time limits", [
                "From a magistrate's court to the High Court: within 30 days of the decree or order (section 79G, Civil Procedure Act).",
                "From the High Court to the Court of Appeal: a notice of appeal is filed within 14 days, under the Court of Appeal Rules.",
                "Late appeals need the court's permission and a good reason for the delay.",
            ]),
            ("Review", [
                "The same court can review its decision on limited grounds, such as a mistake apparent on the record or important new evidence (Order 45).",
            ]),
            ("Stay pending appeal", [
                "An appeal does not automatically stop enforcement. A stay must be applied for (Order 42 rule 6).",
            ]),
        ],
    },
]

ORDINALS = {
    "first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6, "seventh": 7, "eighth": 8,
    "ninth": 9, "tenth": 10, "eleventh": 11, "twelfth": 12, "thirteenth": 13, "fourteenth": 14, "fifteenth": 15,
    "last": len(STEPS),
}
