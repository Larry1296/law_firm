"""What each kind of court sitting is for, and how an advocate and a client prepare for it.

This is general Kenyan civil and criminal practice. It is guidance for preparation,
never a statement of what the court will decide. The advocate remains responsible
for checking it against the matter and the current rules.
"""

KIND_BY_EVENT_TYPE = {
    "MENTION": "MENTION", "FURTHER_MENTION": "MENTION", "COMPLIANCE_MENTION": "MENTION",
    "DIRECTIONS": "MENTION", "OTHER_COURT_DIRECTED": "MENTION",
    "CASE_MANAGEMENT": "PRE_TRIAL", "PRE_TRIAL": "PRE_TRIAL",
    "HEARING": "HEARING", "FURTHER_HEARING": "HEARING", "DEFENCE_HEARING": "HEARING",
    "APPLICATION_HEARING": "APPLICATION", "PRELIMINARY_OBJECTION": "APPLICATION", "REVIEW": "APPLICATION",
    "SUBMISSIONS": "SUBMISSIONS",
    "RULING": "DECISION", "JUDGMENT": "DECISION",
    "TAXATION": "TAXATION",
    "MEDIATION": "MEDIATION", "ADR": "MEDIATION",
    "PLEA": "PLEA",
    "MITIGATION": "SENTENCING", "SENTENCING": "SENTENCING", "PROBATION_REPORT": "SENTENCING",
}

PLAYBOOKS = {
    "MENTION": {
        "purpose": "A short sitting where the court checks progress, confirms whether earlier directions were followed, and gives dates or further directions. No evidence is taken.",
        "checklist": [
            "Confirm compliance with every direction given at the last sitting and have the filing and service dates ready.",
            "Confirm every paper has been served and have the affidavit of service reference to hand.",
            "Know which pending applications need dates, and the dates when you and your witnesses are available.",
            "Take down the court's directions word for word and diarise every date given.",
        ],
        "questions": [
            ("Court", "Have the parties complied with the directions given on the last date?", "The date each document was filed and served, and the reason for anything outstanding."),
            ("Court", "Is the matter ready for pre-trial or hearing?", "What remains outstanding and a realistic time to complete it."),
            ("Opposing counsel", "An objection to the dates proposed or a request to adjourn.", "Your client's prejudice from delay, and a request for costs of any adjournment."),
        ],
        "client_purpose": "A short check-in where the court confirms progress and gives the next date. Witnesses do not give evidence at a mention.",
        "client_role": "You usually do not need to speak. Your advocate will address the court.",
    },
    "PRE_TRIAL": {
        "purpose": "Pre-trial directions under Order 11 of the Civil Procedure Rules: the court confirms that witness statements, lists and copies of documents have been filed and exchanged, considers mediation, and fixes the hearing.",
        "checklist": [
            "Witness statements for every witness filed and served.",
            "List of documents and a paginated bundle filed and served.",
            "Draft agreed issues for determination, or your proposed issues.",
            "Take the client's instructions on court-annexed mediation or settlement before the sitting.",
            "Estimate the number of witnesses and hearing time, and dispose of any interlocutory applications first.",
        ],
        "questions": [
            ("Court", "Have both parties complied with Order 11?", "Filing and service dates of each statement and list; point out any default by the other side."),
            ("Court", "How many witnesses will you call and how long will you need?", "Witness names, the facts each proves, and a realistic time estimate."),
            ("Court", "Is this matter suitable for court-annexed mediation?", "The client's instructions and any settlement position you are authorised to state."),
        ],
        "client_purpose": "The court checks that both sides are ready for trial and may suggest mediation.",
        "client_role": "Your advocate will speak. Tell your advocate beforehand whether you are open to mediation or settlement.",
    },
    "HEARING": {
        "purpose": "The trial: witnesses give evidence on oath, are cross-examined, and documents are produced as exhibits.",
        "checklist": [
            "Every witness confirmed, reachable and briefed on the procedure (never on what to say). Each should re-read their own signed statement.",
            "Originals of every document to be produced, with a paginated bundle and copies for the court and the other side.",
            "An examination-in-chief outline for each witness, tied to the facts pleaded.",
            "A cross-examination plan for each opposing witness, built from their statement and the defence.",
            "Anticipated objections: documents not in the list of documents, admissibility, leading questions.",
            "A witness summons issued for any reluctant witness.",
            "For a virtual sitting: each witness has a quiet private room, a working device and their ID, and knows no one may prompt them off camera.",
        ],
        "questions": [
            ("Opposing counsel", "Challenges to how the documents were made, kept or signed.", "Who made each document, when, and where the original is. Have the original ready to produce."),
            ("Opposing counsel", "Differences between a witness's statement, the pleadings and their oral evidence.", "Read the statements against the pleadings now and deal with any difference in chief, before cross-examination finds it."),
            ("Court", "Clarifying questions on dates, amounts and who did what.", "A one-page chronology and a schedule of amounts with document references."),
        ],
        "client_purpose": "The trial. Witnesses, possibly including you, give evidence and are questioned by both advocates and the court.",
        "client_role": "If you are a witness, you will take an oath or affirm, then answer questions. Otherwise you may follow quietly.",
        "client_witness": [
            "Read your signed witness statement again before the day.",
            "Bring your national ID or passport, and the originals of the documents your advocate asked for.",
            "Tell the truth. Listen to the whole question, answer only that question, and keep answers short.",
            "If you do not know or do not remember, say so. Do not guess.",
            "Ask for a question to be repeated if you did not understand it.",
        ],
    },
    "APPLICATION": {
        "purpose": "The court hears an application or a preliminary objection on the affidavits and the arguments. Witnesses are not usually called.",
        "checklist": [
            "The application or objection and every affidavit (supporting, replying, further) filed and served, with proof of service.",
            "Written submissions and a list of authorities, if directed, filed and served.",
            "The legal test for the orders sought, and how each element is met on the affidavits.",
            "A draft of the exact orders you will ask for.",
        ],
        "questions": [
            ("Court", "Why should the orders be granted, and what prejudice will each side suffer?", "Each element of the legal test, with paragraph references in the affidavits."),
            ("Court", "Has the application been served?", "The affidavit of service and date of service."),
            ("Opposing counsel", "The objection raises facts that need evidence, so it is not a pure point of law.", "Whether the objection can succeed on the pleaded facts alone (the Mukisa Biscuit principle)."),
        ],
        "client_purpose": "The court decides an application on papers and arguments. No one gives evidence.",
        "client_role": "You do not need to speak. Your advocate will argue the application.",
    },
    "SUBMISSIONS": {
        "purpose": "The advocates argue the case on the evidence and the law, usually by written submissions highlighted orally.",
        "checklist": [
            "Written submissions filed and served within the time the court directed.",
            "A list of authorities with copies, and the key passages marked.",
            "A 10 to 15 minute highlight of the decisive issues.",
            "Replies to the points in the other side's submissions.",
        ],
        "questions": [
            ("Court", "What is your strongest authority on the main issue?", "One authority per issue, with the passage marked."),
            ("Court", "How do you answer the other side on a particular issue?", "A short reply to each of their main points."),
        ],
        "client_purpose": "The advocates argue the case. No evidence is taken.",
        "client_role": "You do not need to speak.",
    },
    "DECISION": {
        "purpose": "The court delivers its ruling or judgment. No argument is heard, but counsel may make applications straight after delivery.",
        "checklist": [
            "Attend, or have a colleague hold brief with written instructions.",
            "Take the client's instructions in advance on appeal and on a stay of execution if the decision goes against them.",
            "If adverse: be ready to apply orally for a stay of execution (Order 42 rule 6) and note the appeal timelines, including 30 days from a subordinate court to the High Court (section 79G, Civil Procedure Act).",
            "If favourable: address costs and interest, and plan extraction of the decree.",
            "Request a certified copy of the decision and of the typed proceedings.",
        ],
        "questions": [
            ("Court", "Counsel, any application?", "A stay of execution, leave or time to appeal, or costs, depending on the outcome."),
        ],
        "client_purpose": "The court announces its decision.",
        "client_role": "You do not need to speak. Your advocate will explain the decision and the next steps afterwards.",
    },
    "TAXATION": {
        "purpose": "The taxing officer assesses the bill of costs under the Advocates (Remuneration) Order.",
        "checklist": [
            "Bill of costs filed and served with the notice of taxation.",
            "Receipts for every disbursement claimed.",
            "The basis for the instruction fee, including the value of the subject matter.",
        ],
        "questions": [
            ("Taxing officer", "What is the basis of the instruction fee claimed?", "The value of the subject matter and the applicable schedule."),
        ],
        "client_purpose": "A court officer assesses the legal costs recoverable in the matter.",
        "client_role": "You do not need to attend unless your advocate asks you to.",
    },
    "MEDIATION": {
        "purpose": "A mediator helps the parties negotiate a settlement. What is said in mediation is confidential.",
        "checklist": [
            "The client's written authority and settlement range.",
            "The decision maker attends, or is reachable throughout.",
            "A one-page summary of the claim and the documents that support it.",
        ],
        "questions": [
            ("Mediator", "What would resolve this matter for your client?", "The client's priorities, beyond the headline figure."),
        ],
        "client_purpose": "A confidential meeting with a mediator to try to settle the dispute.",
        "client_role": "You or your decision maker should attend. Discuss your settlement limits with your advocate beforehand.",
    },
    "PLEA": {
        "purpose": "The charge is read to the accused, who pleads guilty or not guilty.",
        "checklist": [
            "Charge sheet and witness statements obtained.",
            "The client's instructions on plea, taken in private.",
            "An interpreter arranged if needed (Article 50(2)(m) of the Constitution).",
            "Bail or bond terms to propose, with any sureties ready.",
        ],
        "questions": [
            ("Court", "Does the accused understand the charge?", "Confirm the language the client understands best."),
            ("Court", "What are the bond terms you propose?", "The client's ties, employment, residence and sureties."),
        ],
        "client_purpose": "The charge is read and you answer whether you plead guilty or not guilty.",
        "client_role": "Answer only as agreed with your advocate. Ask for an interpreter if you need one.",
    },
    "SENTENCING": {
        "purpose": "After conviction, the court hears mitigation and any probation report before sentencing.",
        "checklist": [
            "Mitigation points: personal circumstances, first offender, remorse, family responsibilities.",
            "Character references and any documents supporting mitigation.",
            "The probation officer's report, if ordered, read in advance.",
        ],
        "questions": [
            ("Court", "Anything in mitigation?", "The prepared mitigation points and supporting documents."),
        ],
        "client_purpose": "The court decides the sentence after hearing mitigation.",
        "client_role": "Your advocate will speak for you. Tell them anything the court should know about your circumstances.",
    },
}

DEFAULT_PLAYBOOK = {
    "purpose": "A court sitting in this matter.",
    "checklist": [
        "Confirm the purpose of the sitting from the last order or the cause list.",
        "Have the file, the last orders and your diary ready.",
    ],
    "questions": [],
    "client_purpose": "A court sitting in your matter.",
    "client_role": "Your advocate will explain whether you need to take part.",
}

SUPERIOR_COURTS = {"HIGH_COURT", "COURT_OF_APPEAL", "SUPREME_COURT", "ENVIRONMENT_LAND", "EMPLOYMENT_LABOUR"}


def form_of_address(court_type):
    if court_type in SUPERIOR_COURTS:
        return "Address the judge as \"My Lord\" or \"My Lady\"."
    if court_type == "MAGISTRATE":
        return "Address the magistrate as \"Your Honour\"."
    return "Address the presiding officer as your advocate advises."


def playbook_for(event_type):
    return PLAYBOOKS.get(KIND_BY_EVENT_TYPE.get(event_type, ""), DEFAULT_PLAYBOOK)
