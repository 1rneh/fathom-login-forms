/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { dom, element, out, rule, ruleset, score, type } from "fathom-web";
import { euclidean } from "fathom-web/clusters";
import {
  identity,
  isVisible,
  min,
  setDefault,
} from "fathom-web/utilsForFrontend";

// Whether this is running in the Vectorizer, rather than in-application, in a
// privileged Chrome context
const DEVELOPMENT = true;

// Run me with confidence cutoff = 0.75.
const coefficients = {
  new: [
    ["hasNewLabel", 2.8933305740356445],
    ["hasConfirmLabel", 2.2523245811462402],
    ["hasCurrentLabel", -2.08807635307312],
    ["closestLabelMatchesNew", 2.849792242050171],
    ["closestLabelMatchesConfirm", 2.684239149093628],
    ["closestLabelMatchesCurrent", -2.060974597930908],
    ["hasNewAriaLabel", 2.68821120262146],
    ["hasConfirmAriaLabel", 1.5982069969177246],
    ["hasCurrentAriaLabel", -4.350891590118408],
    ["hasNewPlaceholder", 1.5568645000457764],
    ["hasConfirmPlaceholder", 1.7477933168411255],
    ["hasCurrentPlaceholder", -1.8710709810256958],
    ["forgotPasswordInFormLinkTextContent", -0.7074229121208191],
    ["forgotPasswordInFormLinkHref", -1.3733186721801758],
    ["forgotPasswordInFormLinkTitle", -2.818237066268921],
    ["forgotInFormLinkTextContent", -1.2046741247177124],
    ["forgotInFormLinkHref", 0.49122247099876404],
    ["forgotPasswordInFormButtonTextContent", -0.7202502489089966],
    ["forgotPasswordOnPageLinkTextContent", 0.08068230748176575],
    ["forgotPasswordOnPageLinkHref", -1.0442094802856445],
    ["forgotPasswordOnPageLinkTitle", -0.15383055806159973],
    ["forgotPasswordOnPageButtonTextContent", -1.5646175146102905],
    ["elementAttrsMatchNew", 3.0270659923553467],
    ["elementAttrsMatchConfirm", 1.8866746425628662],
    ["elementAttrsMatchCurrent", -2.079951763153076],
    ["elementAttrsMatchPassword1", 1.557279109954834],
    ["elementAttrsMatchPassword2", 1.304094910621643],
    ["elementAttrsMatchLogin", 1.8217418193817139],
    ["formAttrsMatchRegister", 2.1682863235473633],
    ["formHasRegisterAction", 1.9685839414596558],
    ["formButtonIsRegister", 3.081216812133789],
    ["formAttrsMatchLogin", -0.5824539065361023],
    ["formHasLoginAction", -0.21154648065567017],
    ["formButtonIsLogin", -2.310913562774658],
    ["hasAutocompleteCurrentPassword", 0.14810317754745483],
    ["formHasRememberMeCheckbox", 0.8111697435379028],
    ["formHasRememberMeLabel", 0.08731051534414291],
    ["formHasNewsletterCheckbox", -1.29103684425354],
    ["formHasNewsletterLabel", 2.279517889022827],
    ["closestHeaderAboveIsLoginy", -2.0741889476776123],
    ["closestHeaderAboveIsRegistery", 2.229383707046509],
    ["nextInputIsConfirmy", 2.5517852306365967],
    ["formHasMultipleVisibleInput", 2.8625552654266357],
    ["firstFieldInFormWithThreePasswordFields", -3.0517637729644775],
  ],
};

const biases = [["new", -1.382971167564392]];

const passwordStringRegex = /password|passwort|رمز عبور|mot de passe|パスワード|비밀번호|암호|wachtwoord|senha|Пароль|parol|密码|contraseña|heslo|كلمة السر|kodeord|Κωδικός|pass code|Kata sandi|hasło|รหัสผ่าน|Şifre/i;
const passwordAttrRegex = /pw|pwd|passwd|pass/i;
const newStringRegex = /new|erstellen|create|choose|設定|신규|Créer|Nouveau|baru|nouă/i;
const newAttrRegex = /new/i;
const confirmStringRegex = /wiederholen|wiederholung|confirm|repeat|confirmation|verify|retype|repite|確認|の確認|تکرار|re-enter|확인|bevestigen|confirme|Повторите|tassyklamak|再次输入|ještě jednou|gentag|re-type|confirmar|Répéter|conferma|Repetaţi|again|reenter|再入力|재입력|Ulangi|Bekræft/i;
const confirmAttrRegex = /confirm|retype/i;
const currentAttrAndStringRegex = /current|old|aktuelles|derzeitiges|当前|Atual|actuel|curentă|sekarang/i;
const forgotStringRegex = /vergessen|vergeten|forgot|oublié|dimenticata|Esqueceu|esqueci|Забыли|忘记|找回|Zapomenuté|lost|忘れた|忘れられた|忘れの方|재설정|찾기|help|فراموشی| را فراموش کرده اید|Восстановить|Unuttu|perdus|重新設定|reset|recover|change|remind|find|request|restore|trouble/i;
const forgotHrefRegex = /forgot|reset|recover|change|lost|remind|find|request|restore/i;
const password1Regex = /pw1|pwd1|pass1|passwd1|password1|pwone|pwdone|passone|passwdone|passwordone|pwfirst|pwdfirst|passfirst|passwdfirst|passwordfirst/i;
const password2Regex = /pw2|pwd2|pass2|passwd2|password2|pwtwo|pwdtwo|passtwo|passwdtwo|passwordtwo|pwsecond|pwdsecond|passsecond|passwdsecond|passwordsecond/i;
const loginRegex = /login|log in|log on|log-on|Войти|sign in|sigin|sign\/in|sign-in|sign on|sign-on|ورود|登录|Přihlásit se|Přihlaste|Авторизоваться|Авторизация|entrar|ログイン|로그인|inloggen|Συνδέσου|accedi|ログオン|Giriş Yap|登入|connecter|connectez-vous|Connexion|Вход/i;
const loginFormAttrRegex = /login|log in|log on|log-on|sign in|sigin|sign\/in|sign-in|sign on|sign-on/i;
const registerStringRegex = /create[a-zA-Z\s]+account|activate[a-zA-Z\s]+account|Zugang anlegen|Angaben prüfen|Konto erstellen|register|sign up|ثبت نام|登録|注册|cadastr|Зарегистрироваться|Регистрация|Bellige alynmak|تسجيل|ΕΓΓΡΑΦΗΣ|Εγγραφή|Créer mon compte|Créer un compte|Mendaftar|가입하기|inschrijving|Zarejestruj się|Deschideți un cont|Создать аккаунт|ร่วม|Üye Ol|registr|new account|ساخت حساب کاربری|Schrijf je|S'inscrire/i;
const registerActionRegex = /register|signup|sign-up|create-account|account\/create|join|new_account|user\/create|sign\/up|membership\/create/i;
const registerFormAttrRegex = /signup|join|register|regform|registration|new_user|AccountCreate|create_customer|CreateAccount|CreateAcct|create-account|reg-form|newuser|new-reg|new-form|new_membership/i;
const rememberMeAttrRegex = /remember|auto_login|auto-login|save_mail|save-mail|ricordami|manter|mantenha|savelogin|auto login/i;
const rememberMeStringRegex = /remember me|keep me logged in|keep me signed in|save email address|save id|stay signed in|ricordami|次回からログオンIDの入力を省略する|メールアドレスを保存する|を保存|아이디저장|아이디 저장|로그인 상태 유지|lembrar|manter conectado|mantenha-me conectado|Запомни меня|запомнить меня|Запомните меня|Не спрашивать в следующий раз|下次自动登录|记住我/i;
const newsletterStringRegex = /newsletter|ニュースレター/i;
const passwordStringAndAttrRegex = new RegExp(
  passwordStringRegex.source + "|" + passwordAttrRegex.source,
  "i"
);

function makeRuleset(coeffs, biases) {
  // HTMLElement => (selector => Array<HTMLElement>) nested map to cache querySelectorAll calls.
  let elementToSelectors;
  // We want to clear the cache each time the model is executed to get the latest DOM snapshot
  // for each classification.
  function clearCache() {
    // WeakMaps do not have a clear method
    elementToSelectors = new WeakMap();
  }

  function hasLabelMatchingRegex(element, regex) {
    // Check element.labels
    const labels = element.labels;
    // TODO: Should I be concerned with multiple labels?
    if (labels !== null && labels.length) {
      return regex.test(labels[0].textContent);
    }

    // Check element.aria-labelledby
    let labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy !== null) {
      labelledBy = labelledBy
        .split(" ")
        .map(id => element.getRootNode().getElementById(id))
        .filter(el => el);
      if (labelledBy.length === 1) {
        return regex.test(labelledBy[0].textContent);
      } else if (labelledBy.length > 1) {
        return regex.test(
          min(labelledBy, node => euclidean(node, element)).textContent
        );
      }
    }

    const parentElement = element.parentElement;
    // Bug 1634819: element.parentElement is null if element.parentNode is a ShadowRoot
    if (!parentElement) {
      return false;
    }
    // Check if the input is in a <td>, and, if so, check the textContent of the containing <tr>
    if (parentElement.tagName === "TD" && parentElement.parentElement) {
      // TODO: How bad is the assumption that the <tr> won't be the parent of the <td>?
      return regex.test(parentElement.parentElement.textContent);
    }

    // Check if the input is in a <dd>, and, if so, check the textContent of the preceding <dt>
    if (
      parentElement.tagName === "DD" &&
      // previousElementSibling can be null
      parentElement.previousElementSibling
    ) {
      return regex.test(parentElement.previousElementSibling.textContent);
    }
    return false;
  }

  function closestLabelMatchesRegex(element, regex) {
    const previousElementSibling = element.previousElementSibling;
    if (
      previousElementSibling !== null &&
      previousElementSibling.tagName === "LABEL"
    ) {
      return regex.test(previousElementSibling.textContent);
    }

    const nextElementSibling = element.nextElementSibling;
    if (nextElementSibling !== null && nextElementSibling.tagName === "LABEL") {
      return regex.test(nextElementSibling.textContent);
    }

    const closestLabelWithinForm = closestSelectorElementWithinElement(
      element,
      element.form,
      "label"
    );
    return containsRegex(
      regex,
      closestLabelWithinForm,
      closestLabelWithinForm => closestLabelWithinForm.textContent
    );
  }

  function containsRegex(regex, thingOrNull, thingToString = identity) {
    return thingOrNull !== null && regex.test(thingToString(thingOrNull));
  }

  function closestSelectorElementWithinElement(
    toElement,
    withinElement,
    querySelector
  ) {
    if (withinElement !== null) {
      let nodeList = Array.from(withinElement.querySelectorAll(querySelector));
      if (nodeList.length) {
        return min(nodeList, node => euclidean(node, toElement));
      }
    }
    return null;
  }

  function hasAriaLabelMatchingRegex(element, regex) {
    return containsRegex(regex, element.getAttribute("aria-label"));
  }

  function hasPlaceholderMatchingRegex(element, regex) {
    return containsRegex(regex, element.getAttribute("placeholder"));
  }

  function testRegexesAgainstAnchorPropertyWithinElement(
    property,
    element,
    ...regexes
  ) {
    return hasSomeMatchingPredicateForSelectorWithinElement(
      element,
      "a",
      anchor => {
        const propertyValue = anchor[property];
        return regexes.every(regex => regex.test(propertyValue));
      }
    );
  }

  function testFormButtonsAgainst(element, stringRegex) {
    const form = element.form;
    if (form !== null) {
      let inputs = Array.from(
        form.querySelectorAll("input[type=submit],input[type=button]")
      );
      inputs = inputs.filter(input => {
        return stringRegex.test(input.value);
      });
      if (inputs.length) {
        return true;
      }

      return hasSomeMatchingPredicateForSelectorWithinElement(
        form,
        "button",
        button => {
          return (
            stringRegex.test(button.value) ||
            stringRegex.test(button.textContent) ||
            stringRegex.test(button.id) ||
            stringRegex.test(button.title)
          );
        }
      );
    }
    return false;
  }

  function hasAutocompleteCurrentPassword(fnode) {
    return fnode.element.autocomplete === "current-password";
  }

  // Check cache before calling querySelectorAll on element
  function getElementDescendants(element, selector) {
    // Use the element to look up the selector map:
    const selectorToDescendants = setDefault(
      elementToSelectors,
      element,
      () => new Map()
    );

    // Use the selector to grab the descendants:
    return setDefault(
      selectorToDescendants, // eslint-disable-line prettier/prettier
      selector,
      () => Array.from(element.querySelectorAll(selector))
    );
  }

  /**
   * Return whether the form element directly after this one looks like a
   * confirm-password input.
   */
  function nextInputIsConfirmy(fnode) {
    const form = fnode.element.form;
    const me = fnode.element;
    if (form !== null) {
      let afterMe = false;
      for (const formEl of form.elements) {
        if (formEl === me) {
          afterMe = true;
        } else if (afterMe) {
          if (
            formEl.type === "password" &&
            !formEl.disabled &&
            formEl.getAttribute("aria-hidden") !== "true"
          ) {
            // Now we're looking at a passwordy, visible input[type=password]
            // directly after me.
            return elementAttrsMatchRegex(formEl, confirmAttrRegex);
            // We could check other confirmy smells as well. Balance accuracy
            // against time and complexity.
          }
          // We look only at the very next element, so we may be thrown off by
          // Hide buttons and such.
          break;
        }
      }
    }
    return false;
  }

  /**
   * Returns true when the number of visible input found in the form is over
   * the given threshold.
   *
   * Since the idea in the signal is based on the fact that registration pages
   * often have multiple inputs, this rule only selects inputs whose type is
   * either email, password, text, tel or empty, which are more likely a input
   * field for users to fill their information.
   */
  function formHasMultipleVisibleInput(element, selector, threshold) {
    let form = element.form;
    if (!form) {
      // For password fields don't have an associated form, we apply an heuristic
      // to find a "form" for it. The heuristic works as follow:
      // 1. Locate the closest preceding input.
      // 2. Find the lowest common ancestor of the password field and the closet
      //    preceding input.
      // 3. Assume the common ancestor is the "form" of the password input.
      const previous = closestElementAbove(element, selector);
      if (!previous) {
        return false;
      }
      form = findLowestCommonAncestor(previous, element);
      if (!form) {
        return false;
      }
    }
    const inputs = Array.from(form.querySelectorAll(selector));
    for (const input of inputs) {
      // don't need to check visibility for the element we're testing against
      if (element === input || isVisible(input)) {
        threshold--;
        if (threshold === 0) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Returns true when there are three password fields in the form and the passed
   * element is the first one.
   *
   * The signal is based on that change-password forms with 3 password fields often
   * have the "current password", "new password", and "confirm password" pattern.
   */
  function firstFieldInFormWithThreePasswordFields(fnode) {
    const element = fnode.element;
    const form = element.form;
    if (form) {
      let elements = form.querySelectorAll(
        "input[type=password]:not([disabled], [aria-hidden=true])"
      );
      // Only care forms with three password fields. If there are more than three password
      // fields found, probably we include some hidden fields, so just ignore it.
      if (elements.length == 3 && elements[0] == element) {
        return true;
      }
    }
    return false;
  }

  function hasSomeMatchingPredicateForSelectorWithinElement(
    element,
    selector,
    matchingPredicate
  ) {
    if (element === null) {
      return false;
    }
    const elements = getElementDescendants(element, selector);
    return elements.some(matchingPredicate);
  }

  function textContentMatchesRegexes(element, ...regexes) {
    const textContent = element.textContent;
    return regexes.every(regex => regex.test(textContent));
  }

  function closestHeaderAboveMatchesRegex(element, regex) {
    const closestHeader = closestElementAbove(
      element,
      "h1,h2,h3,h4,h5,h6,div[class*=heading],div[class*=header],div[class*=title],legend"
    );
    if (closestHeader !== null) {
      return regex.test(closestHeader.textContent);
    }
    return false;
  }

  function closestElementAbove(element, selector) {
    let elements = Array.from(element.ownerDocument.querySelectorAll(selector));
    for (let i = elements.length - 1; i >= 0; --i) {
      if (
        element.compareDocumentPosition(elements[i]) &
        Node.DOCUMENT_POSITION_PRECEDING
      ) {
        return elements[i];
      }
    }
    return null;
  }

  function findLowestCommonAncestor(elementA, elementB) {
    // Walk down the ancestor chain of both elements and compare whether the
    // ancestors in the depth are the same. If they are not the same, the
    // ancestor in the previous run is the lowest common ancestor.
    function getAncestorChain(element) {
      let ancestors = [];
      let p = element.parentNode;
      while (p) {
        ancestors.push(p);
        p = p.parentNode;
      }
      return ancestors;
    }

    let aAncestors = getAncestorChain(elementA);
    let bAncestors = getAncestorChain(elementB);
    let posA = aAncestors.length - 1;
    let posB = bAncestors.length - 1;
    for (; posA >= 0 && posB >= 0; posA--, posB--) {
      if (aAncestors[posA] != bAncestors[posB]) {
        return aAncestors[posA + 1];
      }
    }
    return null;
  }

  function elementAttrsMatchRegex(element, regex) {
    if (element !== null) {
      return (
        regex.test(element.id) ||
        regex.test(element.name) ||
        regex.test(element.className)
      );
    }
    return false;
  }

  /**
   * Let us compactly represent a collection of rules that all take a single
   * type with no .when() clause and have only a score() call on the right-hand
   * side.
   */
  function* simpleScoringRulesTakingType(inType, ruleMap) {
    for (const [name, scoringCallback] of Object.entries(ruleMap)) {
      yield rule(type(inType), score(scoringCallback), { name });
    }
  }

  return ruleset(
    [
      rule(
        DEVELOPMENT
          ? dom(
              "input[type=password]:not([disabled]):not([aria-hidden=true]"
            ).when(isVisible)
          : element("input"),
        type("new").note(clearCache)
      ),
      ...simpleScoringRulesTakingType("new", {
        hasNewLabel: fnode =>
          hasLabelMatchingRegex(fnode.element, newStringRegex),
        hasConfirmLabel: fnode =>
          hasLabelMatchingRegex(fnode.element, confirmStringRegex),
        hasCurrentLabel: fnode =>
          hasLabelMatchingRegex(fnode.element, currentAttrAndStringRegex),
        closestLabelMatchesNew: fnode =>
          closestLabelMatchesRegex(fnode.element, newStringRegex),
        closestLabelMatchesConfirm: fnode =>
          closestLabelMatchesRegex(fnode.element, confirmStringRegex),
        closestLabelMatchesCurrent: fnode =>
          closestLabelMatchesRegex(fnode.element, currentAttrAndStringRegex),
        hasNewAriaLabel: fnode =>
          hasAriaLabelMatchingRegex(fnode.element, newStringRegex),
        hasConfirmAriaLabel: fnode =>
          hasAriaLabelMatchingRegex(fnode.element, confirmStringRegex),
        hasCurrentAriaLabel: fnode =>
          hasAriaLabelMatchingRegex(fnode.element, currentAttrAndStringRegex),
        hasNewPlaceholder: fnode =>
          hasPlaceholderMatchingRegex(fnode.element, newStringRegex),
        hasConfirmPlaceholder: fnode =>
          hasPlaceholderMatchingRegex(fnode.element, confirmStringRegex),
        hasCurrentPlaceholder: fnode =>
          hasPlaceholderMatchingRegex(fnode.element, currentAttrAndStringRegex),
        forgotPasswordInFormLinkTextContent: fnode =>
          testRegexesAgainstAnchorPropertyWithinElement(
            "textContent",
            fnode.element.form,
            passwordStringRegex,
            forgotStringRegex
          ),
        forgotPasswordInFormLinkHref: fnode =>
          testRegexesAgainstAnchorPropertyWithinElement(
            "href",
            fnode.element.form,
            passwordStringAndAttrRegex,
            forgotHrefRegex
          ),
        forgotPasswordInFormLinkTitle: fnode =>
          testRegexesAgainstAnchorPropertyWithinElement(
            "title",
            fnode.element.form,
            passwordStringRegex,
            forgotStringRegex
          ),
        forgotInFormLinkTextContent: fnode =>
          testRegexesAgainstAnchorPropertyWithinElement(
            "textContent",
            fnode.element.form,
            forgotStringRegex
          ),
        forgotInFormLinkHref: fnode =>
          testRegexesAgainstAnchorPropertyWithinElement(
            "href",
            fnode.element.form,
            forgotHrefRegex
          ),
        forgotPasswordInFormButtonTextContent: fnode =>
          hasSomeMatchingPredicateForSelectorWithinElement(
            fnode.element.form,
            "button",
            button =>
              textContentMatchesRegexes(
                button,
                passwordStringRegex,
                forgotStringRegex
              )
          ),
        forgotPasswordOnPageLinkTextContent: fnode =>
          testRegexesAgainstAnchorPropertyWithinElement(
            "textContent",
            fnode.element.ownerDocument,
            passwordStringRegex,
            forgotStringRegex
          ),
        forgotPasswordOnPageLinkHref: fnode =>
          testRegexesAgainstAnchorPropertyWithinElement(
            "href",
            fnode.element.ownerDocument,
            passwordStringAndAttrRegex,
            forgotHrefRegex
          ),
        forgotPasswordOnPageLinkTitle: fnode =>
          testRegexesAgainstAnchorPropertyWithinElement(
            "title",
            fnode.element.ownerDocument,
            passwordStringRegex,
            forgotStringRegex
          ),
        forgotPasswordOnPageButtonTextContent: fnode =>
          hasSomeMatchingPredicateForSelectorWithinElement(
            fnode.element.ownerDocument,
            "button",
            button =>
              textContentMatchesRegexes(
                button,
                passwordStringRegex,
                forgotStringRegex
              )
          ),
        elementAttrsMatchNew: fnode =>
          elementAttrsMatchRegex(fnode.element, newAttrRegex),
        elementAttrsMatchConfirm: fnode =>
          elementAttrsMatchRegex(fnode.element, confirmAttrRegex),
        elementAttrsMatchCurrent: fnode =>
          elementAttrsMatchRegex(fnode.element, currentAttrAndStringRegex),
        elementAttrsMatchPassword1: fnode =>
          elementAttrsMatchRegex(fnode.element, password1Regex),
        elementAttrsMatchPassword2: fnode =>
          elementAttrsMatchRegex(fnode.element, password2Regex),
        elementAttrsMatchLogin: fnode =>
          elementAttrsMatchRegex(fnode.element, loginRegex),
        formAttrsMatchRegister: fnode =>
          elementAttrsMatchRegex(fnode.element.form, registerFormAttrRegex),
        formHasRegisterAction: fnode =>
          containsRegex(
            registerActionRegex,
            fnode.element.form,
            form => form.action
          ),
        formButtonIsRegister: fnode =>
          testFormButtonsAgainst(fnode.element, registerStringRegex),
        formAttrsMatchLogin: fnode =>
          elementAttrsMatchRegex(fnode.element.form, loginFormAttrRegex),
        formHasLoginAction: fnode =>
          containsRegex(loginRegex, fnode.element.form, form => form.action),
        formButtonIsLogin: fnode =>
          testFormButtonsAgainst(fnode.element, loginRegex),
        hasAutocompleteCurrentPassword,
        formHasRememberMeCheckbox: fnode =>
          hasSomeMatchingPredicateForSelectorWithinElement(
            fnode.element.form,
            "input[type=checkbox]",
            checkbox =>
              rememberMeAttrRegex.test(checkbox.id) ||
              rememberMeAttrRegex.test(checkbox.name)
          ),
        formHasRememberMeLabel: fnode =>
          hasSomeMatchingPredicateForSelectorWithinElement(
            fnode.element.form,
            "label",
            label => rememberMeStringRegex.test(label.textContent)
          ),
        formHasNewsletterCheckbox: fnode =>
          hasSomeMatchingPredicateForSelectorWithinElement(
            fnode.element.form,
            "input[type=checkbox]",
            checkbox =>
              checkbox.id.includes("newsletter") ||
              checkbox.name.includes("newsletter")
          ),
        formHasNewsletterLabel: fnode =>
          hasSomeMatchingPredicateForSelectorWithinElement(
            fnode.element.form,
            "label",
            label => newsletterStringRegex.test(label.textContent)
          ),
        closestHeaderAboveIsLoginy: fnode =>
          closestHeaderAboveMatchesRegex(fnode.element, loginRegex),
        closestHeaderAboveIsRegistery: fnode =>
          closestHeaderAboveMatchesRegex(fnode.element, registerStringRegex),
        nextInputIsConfirmy,
        formHasMultipleVisibleInput: fnode =>
          formHasMultipleVisibleInput(
            fnode.element,
            "input[type=email],input[type=password],input[type=text],input[type=tel]",
            3
          ),
        firstFieldInFormWithThreePasswordFields,
      }),
      rule(type("new"), out("new")),
    ],
    coeffs,
    biases
  );
}

const trainees = new Map();
const VIEWPORT_SIZE = {
  width: 1366,
  height: 768,
};

const FEATURES = ["new"];
for (const feature of FEATURES) {
  const trainee = {
    coeffs: new Map(coefficients[feature]),
    viewportSize: VIEWPORT_SIZE,
    vectorType: feature,
    rulesetMaker: () => makeRuleset([...coefficients.new], biases),
    isTarget: fnode =>
      fnode.element.dataset.fathom === "new" ||
      fnode.element.dataset.fathom === "confirm",
  };
  trainees.set(feature, trainee);
}

export default trainees;
