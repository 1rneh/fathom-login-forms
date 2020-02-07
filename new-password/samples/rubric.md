# Object

Capture forms that ask the user to choose a new password: for example, https://www.homedepot.com/auth/view/createaccount?redirect=/ or https://myaccount.nytimes.com/auth/register. I forsee mostly create-account pages, but let's talk about it if you discover other ones. I have considered change-password pages (as in changing the password for an existing account), but those are going to be rather time-consuming to collect since they require creating accounts first. So let's skip those for now.

# Viewport Size

Please use a viewport size (not window size but viewport size) of 1366x768.

# Labeling

Here's what to label:

* "new": The <input> (generally type=password) that collects the new password
* "confirm": The <input>, if any, in which you re-type the new password to confirm it

If it turns out there are pages that don't use <input> elements, let's talk.

# Corpus Collection

* Please do get forms in various languages.
* We're collecting from a shuffled Trexa list. The shuffling is because we want to get started on feature engineering while samples are still being collected. Thus, we need the samples to come in from a uniform distribution, not the skewed one characteristic of starting with popular domains and only afterward descending into the long, weird tail. Several of us are collecting samples in parallel. Domains from the list that have been allocated to a collector are indicated by putting the person's name by the domain name in tranco_100k_alexa_100k_union_shuffled_2019-12-14.tsv.