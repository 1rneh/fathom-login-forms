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

# Sample Naming

Samples are named `{language}_{"X" if non-Trexa}{line number in tranco_100k_alexa_100k_union_shuffled_2019-12-14.tsv}{"a", "b", "c", etc., in case there is more than one sample from a domain}{"n" if negative}{"_change" if it's a change-password form}.html`.

The language prefix helps us make sure each set gets some of each language, which might not happen by random chance in a small corpus.

For cases where the sample is not from a Trexa domain (that is, one in the TSV file), we put an X before an arbitrary, increasing serial number, just to split them into a different namespace, e.g. `EN_X1.html`, `DE_X2.html`, etc.

Samples consisting wholly of negative samples have an "n" added: `EN_1n.html`. This saves the user of fathom-train manual checking when the tool reports that it's treating a sample as a negative.
