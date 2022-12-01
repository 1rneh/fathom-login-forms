# Object

Capture sign-up scenarios, e.g. https://en.wikipedia.org/w/index.php?title=Special:CreateAccount&returnto=Main+Page or https://www.chess.com/register?returnUrl=https://www.chess.com/

Currently we only label forms. Handling formless sign-up scenarios will follow.

# Viewport Size

Please use a viewport size (not window size but viewport size) of 1366x768.

# Labeling

Here's what to label:

- "signup-form": The <form> that contains the <input> elements, like username/email and password, that a user would usually fill out in order to sign up

# Corpus Collection

- Please do get forms in various languages.
- Collect positive and negative examples.

# Sample Naming

Samples are named `{language}_{domain}{"_n" if negative}.html`.

Examples:

- EN_chess.com.html
- EN_chess.com_n.html
- EN_yahoo.com.html

The language prefix helps us make sure each set gets some of each language, which might not happen by random chance in a small corpus.

Samples consisting wholly of negative samples have an "\_n" added. This saves the user of fathom-train manual checking when the tool reports that it's treating a sample as a negative.
