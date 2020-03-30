/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-disable import/no-unresolved */
import {dom, element, out, rule, ruleset, score, type} from "fathom-web";
import {euclidean} from "fathom-web/clusters";
import {identity, isVisible, min} from "fathom-web/utilsForFrontend";

// Whether this is running in the Vectorizer, rather than in-application, in a
// privileged Chrome context
const DEVELOPMENT = true;

const coefficients = {
  "new": [
    ["hasNewLabel", 1.181418538093567],
    ["hasConfirmLabel", 0.9669075608253479],
    ["hasCurrentLabel", -1.4389817714691162],
    ["closestLabelMatchesNew", 1.4884552955627441],
    ["closestLabelMatchesConfirm", 1.0411170721054077],
    ["closestLabelMatchesCurrent", -1.8205960988998413],
    ["hasNewAriaLabel", 1.2995644807815552],
    ["hasConfirmAriaLabel", 1.1805509328842163],
    ["hasCurrentAriaLabel", -0.5234949588775635],
    ["hasNewPlaceholder", 0.9390965700149536],
    ["hasConfirmPlaceholder", 0.9714533686637878],
    ["hasCurrentPlaceholder", -1.9007221460342407],
    ["forgotPasswordInFormLinkTextContent", -0.3656247854232788],
    ["forgotPasswordInFormLinkHref", -1.0175663232803345],
    ["forgotPasswordInFormLinkTitle", -2.1538305282592773],
    ["forgotInFormLinkTextContent", -0.6785879135131836],
    ["forgotInFormLinkHref", 0.15976755321025848],
    ["forgotPasswordInFormButtonTextContent", -1.3126596212387085],
    ["forgotPasswordOnPageLinkTextContent", -0.960637092590332],
    ["forgotPasswordOnPageLinkHref", -0.33086448907852173],
    ["forgotPasswordOnPageLinkTitle", 0.6779727339744568],
    ["forgotPasswordOnPageButtonTextContent", 0.11299622058868408],
    ["elementAttrsMatchNew", 1.3486062288284302],
    ["elementAttrsMatchConfirm", 0.9134238958358765],
    ["elementAttrsMatchCurrent", -1.4445650577545166],
    ["elementAttrsMatchPassword1", 1.1937973499298096],
    ["elementAttrsMatchPassword2", 1.08907151222229],
    ["elementAttrsMatchLogin", 0.8115954995155334],
    ["formAttrsMatchRegister", 1.2902318239212036],
    ["formHasRegisterAction", 1.346893310546875],
    ["formButtonIsRegister", 1.4821434020996094],
    ["formAttrsMatchLogin", -0.9153445363044739],
    ["formHasLoginAction", -0.44380852580070496],
    ["formButtonIsLogin", -1.6553007364273071],
    ["hasAutocompleteCurrentPassword", -2.163212776184082],
    ["formHasRememberMeCheckbox", 0.49775782227516174],
    ["formHasRememberMeLabel", -0.1991603970527649],
    ["formHasNewsletterCheckbox", 0.9166104793548584],
    ["formHasNewsletterLabel", 1.299912452697754],
    ["closestHeaderAboveIsLoginy", -1.454039216041565],
    ["closestHeaderAboveIsRegistery", 0.9860362410545349],
  ]
};

const biases = [
  ["new", 1.2344558238983154]
];

const passwordStringRegex = /password|passwort|رمز عبور|mot de passe|パスワード|비밀번호|암호|wachtwoord|senha|Пароль|parol|密码|contraseña|heslo|كلمة السر|kodeord|Κωδικός|pass code|Kata sandi|hasło|รหัสผ่าน|Şifre/i;
const passwordAttrRegex = /pw|pwd|passwd|pass/i;
const newStringRegex = /new|erstellen|create|choose|設定|신규/i;
const newAttrRegex = /new/i;
const confirmStringRegex = /wiederholen|wiederholung|confirm|repeat|confirmation|verify|retype|repite|確認|の確認|تکرار|re-enter|확인|bevestigen|confirme|Повторите|tassyklamak|再次输入|ještě jednou|gentag|re-type|confirmar|Répéter|conferma|Repetaţi|again|reenter/i;
const confirmAttrRegex = /confirm|retype/i;
const currentAttrAndStringRegex = /current|old/i;
const forgotStringRegex = /vergessen|vergeten|forgot|oublié|dimenticata|Esqueceu|esqueci|Забыли|忘记|找回|Zapomenuté|lost|忘れた|忘れられた|忘れの方|재설정|찾기|help|فراموشی| را فراموش کرده اید|Восстановить|Unuttu|perdus|重新設定|reset|recover|change|remind|find|request|restore|trouble/i;
const forgotHrefRegex = /forgot|reset|recover|change|lost|remind|find|request|restore/i;
const password1Regex = /pw1|pwd1|pass1|passwd1|password1|pwone|pwdone|passone|passwdone|passwordone|pwfirst|pwdfirst|passfirst|passwdfirst|passwordfirst/i;
const password2Regex = /pw2|pwd2|pass2|passwd2|password2|pwtwo|pwdtwo|passtwo|passwdtwo|passwordtwo|pwsecond|pwdsecond|passsecond|passwdsecond|passwordsecond/i;
const loginRegex = /login|log in|log on|log-on|Войти|sign in|sigin|sign\/in|sign-in|sign on|sign-on|ورود|登录|Přihlásit se|Přihlaste|Авторизоваться|Авторизация|entrar|ログイン|로그인|inloggen|Συνδέσου|accedi|ログオン|Giriş Yap|登入|connecter|connectez-vous|Connexion|Вход/i;
const loginFormAttrRegex = /login|log in|log on|log-on|sign in|sigin|sign\/in|sign-in|sign on|sign-on/i;
const registerStringRegex = /create[a-zA-Z\s]+account|Zugang anlegen|Angaben prüfen|Konto erstellen|register|sign up|ثبت نام|登録|注册|cadastr|Зарегистрироваться|Регистрация|Bellige alynmak|تسجيل|ΕΓΓΡΑΦΗΣ|Εγγραφή|Créer mon compte|Mendaftar|가입하기|inschrijving|Zarejestruj się|Deschideți un cont|Создать аккаунт|ร่วม|Üye Ol|registr|new account|ساخت حساب کاربری|Schrijf je/i;
const registerActionRegex = /register|signup|sign-up|create-account|account\/create|join|new_account|user\/create|sign\/up|membership\/create/i;
const registerFormAttrRegex = /signup|join|register|regform|registration|new_user|AccountCreate|create_customer|CreateAccount|CreateAcct|create-account|reg-form|newuser|new-reg|new-form|new_membership/i;
const rememberMeAttrRegex = /remember|auto_login|auto-login|save_mail|save-mail|ricordami|manter|mantenha|savelogin|auto login/i;
const rememberMeStringRegex = /remember me|keep me logged in|keep me signed in|save email address|save id|stay signed in|ricordami|次回からログオンIDの入力を省略する|メールアドレスを保存する|を保存|아이디저장|아이디 저장|로그인 상태 유지|lembrar|manter conectado|mantenha-me conectado|Запомни меня|запомнить меня|Запомните меня|Не спрашивать в следующий раз|下次自动登录|记住我/i;
const newsletterStringRegex = /newsletter|ニュースレター/i;

function makeRuleset(coeffs, biases) {
  function hasLabelMatchingRegex(element, regex) {
    // Check element.labels
    const labels = element.labels;
    // TODO: Should I be concerned with multiple labels?
    if (labels !== null && labels.length > 0) {
      return regex.test(labels[0].textContent);
    }

    // Check element.aria-labelledby
    let labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy !== null) {
      labelledBy = labelledBy.split(" ").map(id => element.ownerDocument.getElementById(id));
      if (labelledBy.length === 1) {
        return regex.test(labelledBy[0].textContent);
      } else if (labelledBy.length > 1) {
        return regex.test(min(labelledBy, node => euclidean(node, element)).textContent);
      }
    }

    const parentElement = element.parentElement;
    // Check if the input is in a <td>, and, if so, check the textContent of the containing <tr>
    if (parentElement.tagName === "TD") {
      // TODO: How bad is the assumption that the <tr> won't be the parent of the <td>?
      return regex.test(parentElement.parentElement.textContent);
    }

    // Check if the input is in a <dd>, and, if so, check the textContent of the preceding <dt>
    if (parentElement.tagName === "DD") {
      return regex.test(parentElement.previousElementSibling.textContent);
    }
    return false;
  }

  function closestLabelMatchesRegex(element, regex) {
    const previousElementSibling = element.previousElementSibling;
    if (previousElementSibling !== null && previousElementSibling.tagName === "LABEL") {
      return regex.test(previousElementSibling.textContent);
    }

    const nextElementSibling = element.nextElementSibling;
    if (nextElementSibling !== null && nextElementSibling.tagName === "LABEL") {
      return regex.test(nextElementSibling.textContent);
    }

    const closestLabelWithinForm = closestSelectorElementWithinElement(element, element.form, "label");
    return containsRegex(regex, closestLabelWithinForm, closestLabelWithinForm => closestLabelWithinForm.textContent);
  }

  function containsRegex(regex, thingOrNull, thingToString=identity) {
    return thingOrNull !== null && regex.test(thingToString(thingOrNull));
  }

  function closestSelectorElementWithinElement(toElement, withinElement, querySelector) {
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

  function testRegexesAgainstAnchorPropertyWithinElement(property, element, ...regexes) {
    return hasSomeMatchingPredicateForSelectorWithinElement(element, "a", anchor => {
      const propertyValue = anchor[property];
      return regexes.every(regex => regex.test(propertyValue));
    })
  }

  function testFormButtonsAgainst(element, stringRegex) {
    const form = element.form;
    if (form !== null) {
      let inputs = Array.from(form.querySelectorAll("input[type=submit],input[type=button]"));
      inputs = inputs.filter(input => {
        return stringRegex.test(input.value);
      });
      if (inputs.length) {
        return true;
      }

      return hasSomeMatchingPredicateForSelectorWithinElement(form, "button", button => {
        return stringRegex.test(button.value) || stringRegex.test(button.textContent) || stringRegex.test(button.id) || stringRegex.test(button.title);
      });
    }
    return false;
  }

  function hasAutocompleteCurrentPassword(fnode) {
    return fnode.element.autocomplete === "current-password";
  }

  function hasSomeMatchingPredicateForSelectorWithinElement(element, selector, matchingPredicate) {
    if (element !== null) {
      const selectorArray = Array.from(element.querySelectorAll(selector));
      return selectorArray.some(matchingPredicate);
    }
    return false;
  }

  function textContentMatchesRegexes(element, ...regexes) {
    const textContent = element.textContent;
    return regexes.every(regex => regex.test(textContent));
  }

  function closestHeaderAboveMatchesRegex(element, regex) {
    const closestHeader = closestHeaderAbove(element);
    if (closestHeader !== null) {
      return regex.test(closestHeader.textContent);
    }
    return false;
  }

  function closestHeaderAbove(element) {
    let headers = Array.from(element.ownerDocument.querySelectorAll("h1,h2,h3,h4,h5,h6,div[class*=heading],div[class*=header],div[class*=title],legend"));
    for (let i = headers.length - 1; i >= 0; --i) {
      const header = headers[i];
      if (element.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_PRECEDING) {
        return header;
      }
    }
    return null;
  }

  function elementAttrsMatchRegex(element, regex) {
    if (element !== null) {
      return regex.test(element.id + element.name + element.className);
    }
    return false;
  }

  return ruleset([
      rule((DEVELOPMENT ? dom("input[type=password]").when(isVisible) : element("input")), type("new")),
      rule(type("new"), score(fnode => hasLabelMatchingRegex(fnode.element, newStringRegex)), {name: "hasNewLabel"}),
      rule(type("new"), score(fnode => hasLabelMatchingRegex(fnode.element, confirmStringRegex)), {name: "hasConfirmLabel"}),
      rule(type("new"), score(fnode => hasLabelMatchingRegex(fnode.element, currentAttrAndStringRegex)), {name: "hasCurrentLabel"}),
      rule(type("new"), score(fnode => closestLabelMatchesRegex(fnode.element, newStringRegex)), {name: "closestLabelMatchesNew"}),
      rule(type("new"), score(fnode => closestLabelMatchesRegex(fnode.element, confirmStringRegex)), {name: "closestLabelMatchesConfirm"}),
      rule(type("new"), score(fnode => closestLabelMatchesRegex(fnode.element, currentAttrAndStringRegex)), {name: "closestLabelMatchesCurrent"}),
      rule(type("new"), score(fnode => hasAriaLabelMatchingRegex(fnode.element, newStringRegex)), {name: "hasNewAriaLabel"}),
      rule(type("new"), score(fnode => hasAriaLabelMatchingRegex(fnode.element, confirmStringRegex)), {name: "hasConfirmAriaLabel"}),
      rule(type("new"), score(fnode => hasAriaLabelMatchingRegex(fnode.element, currentAttrAndStringRegex)), {name: "hasCurrentAriaLabel"}),
      rule(type("new"), score(fnode => hasPlaceholderMatchingRegex(fnode.element, newStringRegex)), {name: "hasNewPlaceholder"}),
      rule(type("new"), score(fnode => hasPlaceholderMatchingRegex(fnode.element, confirmStringRegex)), {name: "hasConfirmPlaceholder"}),
      rule(type("new"), score(fnode => hasPlaceholderMatchingRegex(fnode.element, currentAttrAndStringRegex)), {name: "hasCurrentPlaceholder"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("textContent", fnode.element.form, passwordStringRegex, forgotStringRegex)), {name: "forgotPasswordInFormLinkTextContent"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("href", fnode.element.form, (new RegExp(passwordStringRegex.source + "|" + passwordAttrRegex.source, "i")), forgotHrefRegex)), {name: "forgotPasswordInFormLinkHref"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("title", fnode.element.form, passwordStringRegex, forgotStringRegex)), {name: "forgotPasswordInFormLinkTitle"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("textContent", fnode.element.form, forgotStringRegex)), {name: "forgotInFormLinkTextContent"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("href", fnode.element.form, forgotHrefRegex)), {name: "forgotInFormLinkHref"}),
      rule(type("new"), score(fnode => hasSomeMatchingPredicateForSelectorWithinElement(fnode.element.form, "button", button => textContentMatchesRegexes(button, passwordStringRegex, forgotStringRegex))), {name: "forgotPasswordInFormButtonTextContent"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("textContent", fnode.element.ownerDocument, passwordStringRegex, forgotStringRegex)), {name: "forgotPasswordOnPageLinkTextContent"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("href", fnode.element.ownerDocument, (new RegExp(passwordStringRegex.source + "|" + passwordAttrRegex.source, "i")), forgotHrefRegex)), {name: "forgotPasswordOnPageLinkHref"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("title", fnode.element.ownerDocument, passwordStringRegex, forgotStringRegex)), {name: "forgotPasswordOnPageLinkTitle"}),
      rule(type("new"), score(fnode => hasSomeMatchingPredicateForSelectorWithinElement(fnode.element.ownerDocument, "button", button => textContentMatchesRegexes(button, passwordStringRegex, forgotStringRegex))), {name: "forgotPasswordOnPageButtonTextContent"}),
      rule(type("new"), score(fnode => elementAttrsMatchRegex(fnode.element, newAttrRegex)), {name: "elementAttrsMatchNew"}),
      rule(type("new"), score(fnode => elementAttrsMatchRegex(fnode.element, confirmAttrRegex)), {name: "elementAttrsMatchConfirm"}),
      rule(type("new"), score(fnode => elementAttrsMatchRegex(fnode.element, currentAttrAndStringRegex)), {name: "elementAttrsMatchCurrent"}),
      rule(type("new"), score(fnode => elementAttrsMatchRegex(fnode.element, password1Regex)), {name: "elementAttrsMatchPassword1"}),
      rule(type("new"), score(fnode => elementAttrsMatchRegex(fnode.element, password2Regex)), {name: "elementAttrsMatchPassword2"}),
      rule(type("new"), score(fnode => elementAttrsMatchRegex(fnode.element, loginRegex)), {name: "elementAttrsMatchLogin"}),
      rule(type("new"), score(fnode => elementAttrsMatchRegex(fnode.element.form, registerFormAttrRegex)), {name: "formAttrsMatchRegister"}),
      rule(type("new"), score(fnode => containsRegex(registerActionRegex, fnode.element.form, form => form.action)), {name: "formHasRegisterAction"}),
      rule(type("new"), score(fnode => testFormButtonsAgainst(fnode.element, registerStringRegex)), {name: "formButtonIsRegister"}),
      rule(type("new"), score(fnode => elementAttrsMatchRegex(fnode.element.form, loginFormAttrRegex)), {name: "formAttrsMatchLogin"}),
      rule(type("new"), score(fnode => containsRegex(loginRegex, fnode.element.form, form => form.action)), {name: "formHasLoginAction"}),
      rule(type("new"), score(fnode => testFormButtonsAgainst(fnode.element, loginRegex)), {name: "formButtonIsLogin"}),
      rule(type("new"), score(hasAutocompleteCurrentPassword), {name: "hasAutocompleteCurrentPassword"}),
      rule(type("new"), score(fnode => hasSomeMatchingPredicateForSelectorWithinElement(fnode.element.form, "input[type=checkbox]", checkbox => rememberMeAttrRegex.test(checkbox.id) || rememberMeAttrRegex.test(checkbox.name))), {name: "formHasRememberMeCheckbox"}),
      rule(type("new"), score(fnode => hasSomeMatchingPredicateForSelectorWithinElement(fnode.element.form, "label", label => rememberMeStringRegex.test(label.textContent))), {name: "formHasRememberMeLabel"}),
      rule(type("new"), score(fnode => hasSomeMatchingPredicateForSelectorWithinElement(fnode.element.form, "input[type=checkbox]", checkbox => checkbox.id.includes("newsletter") || checkbox.name.includes("newsletter"))), {name: "formHasNewsletterCheckbox"}),
      rule(type("new"), score(fnode => hasSomeMatchingPredicateForSelectorWithinElement(fnode.element.form, "label", label => newsletterStringRegex.test(label.textContent))), {name: "formHasNewsletterLabel"}),
      rule(type("new"), score(fnode => closestHeaderAboveMatchesRegex(fnode.element, loginRegex)), {name: "closestHeaderAboveIsLoginy"}),
      rule(type("new"), score(fnode => closestHeaderAboveMatchesRegex(fnode.element, registerStringRegex)), {name: "closestHeaderAboveIsRegistery"}),
      rule(type("new"), out("new"))
    ],
    coeffs,
    biases);
}

const trainees = new Map();
const VIEWPORT_SIZE = {width: 1366, height: 768};

const FEATURES = ["new"];
for (const feature of FEATURES) {
  const trainee = {
    coeffs: new Map(coefficients[feature]),
    viewportSize: VIEWPORT_SIZE,
    vectorType: feature,
    rulesetMaker: () => makeRuleset([
        ...coefficients.new,
      ],
      biases),
    isTarget: fnode => (fnode.element.dataset.fathom === "new" ||
                        fnode.element.dataset.fathom === "confirm")
  };
  trainees.set(feature, trainee);
}

export default trainees;
