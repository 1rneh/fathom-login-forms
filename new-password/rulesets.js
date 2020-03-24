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
    ["hasNewLabel", 1.1194627285003662],
    ["hasConfirmLabel", 1.2456986904144287],
    ["closestLabelMatchesNew", 1.3738138675689697],
    ["closestLabelMatchesConfirm", 1.2508422136306763],
    ["hasNewAriaLabel", 1.5245254039764404],
    ["hasConfirmAriaLabel", 1.5614348649978638],
    ["hasNewPlaceholder", 1.1226696968078613],
    ["hasConfirmPlaceholder", 0.8064031600952148],
    ["forgotPasswordInFormLinkTextContent", -0.17467717826366425],
    ["forgotPasswordInFormLinkHref", -1.302171230316162],
    ["forgotPasswordInFormLinkTitle", -2.377636671066284],
    ["forgotInFormLinkTextContent", -0.5661768913269043],
    ["forgotInFormLinkHref", -0.07695100456476212],
    ["forgotPasswordInFormButtonTextContent", -0.7066062688827515],
    ["forgotPasswordOnPageLinkTextContent", -0.8544114828109741],
    ["forgotPasswordOnPageLinkHref", -0.3598223328590393],
    ["forgotPasswordOnPageLinkTitle", 1.0128145217895508],
    ["forgotPasswordOnPageButtonTextContent", 0.25431129336357117],
    ["idIsPassword1Or2", 0.9488276839256287],
    ["nameIsPassword1Or2", 1.0514147281646729],
    ["idMatchesLogin", -1.5376290082931519],
    ["nameMatchesLogin", 2.63124418258667],
    ["classMatchesLogin", -1.6350187063217163],
    ["formHasRegisteryId", 1.2693848609924316],
    ["formHasRegisteryName", 1.181613802909851],
    ["formHasRegisteryClass", 0.6962587237358093],
    ["formHasRegisteryAction", 1.3415199518203735],
    ["formHasLoginyId", -0.785906195640564],
    ["formHasLoginyName", -1.4619747400283813],
    ["formHasLoginyClass", -0.43465545773506165],
    ["formHasLoginyAction", -0.8317834138870239],
    ["formButtonIsRegistery", 1.6268166303634644],
    ["formButtonIsLoginy", -1.78903329372406],
    ["hasAutocompleteCurrentPassword", -2.0786564350128174],
    ["formHasRememberMeCheckbox", 0.15255111455917358],
    ["formHasRememberMeLabel", -0.26837822794914246],
    ["closestHeaderAboveIsLoginy", -1.4562782049179077],
    ["closestHeaderAboveIsRegistery", 1.107210636138916],
  ]
};

const biases = [
  ["new", 1.399000644683838]
];

const passwordRegex = /password|passwort|رمز عبور|mot de passe|パスワード|비밀번호|암호|wachtwoord|senha|Пароль|parol|密码|contraseña|heslo|كلمة السر|kodeord|Κωδικός|pass code|Kata sandi|hasło|รหัสผ่าน|Şifre/i;
const newRegex = /erstellen|create|choose|設定|신규/i;
const confirmRegex = /wiederholen|wiederholung|confirm|repeat|confirmation|verify|retype|repite|確認|の確認|تکرار|re-enter|확인|bevestigen|confirme|Повторите|tassyklamak|再次输入|ještě jednou|gentag|re-type|confirmar|Répéter|conferma|Repetaţi/i;
const forgotStringRegex = /vergessen|vergeten|forgot|oublié|dimenticata|Esqueceu|esqueci|Забыли|忘记|找回|Zapomenuté|lost|忘れた|忘れられた|忘れの方|재설정|찾기|help|فراموشی| را فراموش کرده اید|Восстановить|Unuttu|perdus|重新設定|reset|recover|change|remind|find|request|restore|trouble/i;
const forgotHrefRegex = /forgot|reset|recover|change|lost|remind|find|request|restore/i;
const password1Or2Regex = /password1|password2/i;
const passwordyRegex = /pw|pwd|passwd|pass/i;
const loginRegex = /login|Войти|sign in|ورود|登录|Přihlásit se|Přihlaste|Авторизоваться|Авторизация|signin|log in|sign\/in|sign-in|entrar|ログイン|로그인|inloggen|Συνδέσου|accedi|ログオン|Giriş Yap|登入|connecter|sign on|sign-on|connectez-vous|Connexion|Вход/i;
const registerStringRegex = /create[a-zA-Z\s]+account|Zugang anlegen|Angaben prüfen|Konto erstellen|register|sign up|ثبت نام|登録|注册|cadastr|Зарегистрироваться|Регистрация|Bellige alynmak|تسجيل|ΕΓΓΡΑΦΗΣ|Εγγραφή|Créer mon compte|Mendaftar|가입하기|inschrijving|Zarejestruj się|Deschideți un cont|Создать аккаунт|ร่วม|Üye Ol|registr|new account|ساخت حساب کاربری|Schrijf je/i;
const registerActionRegex = /register|signup|sign-up|create-account|account\/create|join|new_account|user\/create|sign\/up|membership\/create/i;
const loginFormAttrRegex = /login|signin|sign-in/i;
const registerFormAttrRegex = /signup|join|register|regform|registration|new_user|AccountCreate|create_customer|CreateAccount|CreateAcct|create-account|reg-form|newuser|new-reg|new-form|new_membership/i;
const rememberMeAttrRegex = /remember|auto_login|auto-login|save_mail|save-mail|ricordami|manter|mantenha|savelogin|auto login/i;
const rememberMeStringRegex = /remember me|keep me logged in|keep me signed in|save email address|save id|stay signed in|ricordami|次回からログオンIDの入力を省略する|メールアドレスを保存する|を保存|아이디저장|아이디 저장|로그인 상태 유지|lembrar|manter conectado|mantenha-me conectado|Запомни меня|запомнить меня|Запомните меня|Не спрашивать в следующий раз|下次自动登录|记住我/i;

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
    let headers = Array.from(element.ownerDocument.querySelectorAll("h1,h2,h3,h4,h5,h6,div[class*=heading],div[class*=header],div[class*=title],legend")).filter(header => {
      const relativePosition = element.compareDocumentPosition(header);
      // 10 is the combination of Node.DOCUMENT_POSITION_PRECEDING and Node.DOCUMENT_POSITION_CONTAINS
      return (relativePosition === Node.DOCUMENT_POSITION_PRECEDING) || (relativePosition === 10)
    });
    if (headers.length) {
      return headers[headers.length - 1];
    }
    return null;
  }

  return ruleset([
      rule((DEVELOPMENT ? dom("input[type=password]").when(isVisible) : element("input")), type("new")),
      rule(type("new"), score(fnode => hasLabelMatchingRegex(fnode.element, newRegex)), {name: "hasNewLabel"}),
      rule(type("new"), score(fnode => hasLabelMatchingRegex(fnode.element, confirmRegex)), {name: "hasConfirmLabel"}),
      rule(type("new"), score(fnode => closestLabelMatchesRegex(fnode.element, newRegex)), {name: "closestLabelMatchesNew"}),
      rule(type("new"), score(fnode => closestLabelMatchesRegex(fnode.element, confirmRegex)), {name: "closestLabelMatchesConfirm"}),
      rule(type("new"), score(fnode => hasAriaLabelMatchingRegex(fnode.element, newRegex)), {name: "hasNewAriaLabel"}),
      rule(type("new"), score(fnode => hasAriaLabelMatchingRegex(fnode.element, confirmRegex)), {name: "hasConfirmAriaLabel"}),
      rule(type("new"), score(fnode => hasPlaceholderMatchingRegex(fnode.element, newRegex)), {name: "hasNewPlaceholder"}),
      rule(type("new"), score(fnode => hasPlaceholderMatchingRegex(fnode.element, confirmRegex)), {name: "hasConfirmPlaceholder"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("textContent", fnode.element.form, passwordRegex, forgotStringRegex)), {name: "forgotPasswordInFormLinkTextContent"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("href", fnode.element.form, (new RegExp(passwordRegex.source + "|" + passwordyRegex.source, "i")), forgotHrefRegex)), {name: "forgotPasswordInFormLinkHref"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("title", fnode.element.form, passwordRegex, forgotStringRegex)), {name: "forgotPasswordInFormLinkTitle"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("textContent", fnode.element.form, forgotStringRegex)), {name: "forgotInFormLinkTextContent"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("href", fnode.element.form, forgotHrefRegex)), {name: "forgotInFormLinkHref"}),
      rule(type("new"), score(fnode => hasSomeMatchingPredicateForSelectorWithinElement(fnode.element.form, "button", button => textContentMatchesRegexes(button, passwordRegex, forgotStringRegex))), {name: "forgotPasswordInFormButtonTextContent"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("textContent", fnode.element.ownerDocument, passwordRegex, forgotStringRegex)), {name: "forgotPasswordOnPageLinkTextContent"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("href", fnode.element.ownerDocument, (new RegExp(passwordRegex.source + "|" + passwordyRegex.source, "i")), forgotHrefRegex)), {name: "forgotPasswordOnPageLinkHref"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("title", fnode.element.ownerDocument, passwordRegex, forgotStringRegex)), {name: "forgotPasswordOnPageLinkTitle"}),
      rule(type("new"), score(fnode => hasSomeMatchingPredicateForSelectorWithinElement(fnode.element.ownerDocument, "button", button => textContentMatchesRegexes(button, passwordRegex, forgotStringRegex))), {name: "forgotPasswordOnPageButtonTextContent"}),
      rule(type("new"), score(fnode => password1Or2Regex.test(fnode.element.id)), {name: "idIsPassword1Or2"}),
      rule(type("new"), score(fnode => password1Or2Regex.test(fnode.element.name)), {name: "nameIsPassword1Or2"}),
      rule(type("new"), score(fnode => loginRegex.test(fnode.element.id)), {name: "idMatchesLogin"}),
      rule(type("new"), score(fnode => loginRegex.test(fnode.element.name)), {name: "nameMatchesLogin"}),
      rule(type("new"), score(fnode => loginRegex.test(fnode.element.className)), {name: "classMatchesLogin"}),
      rule(type("new"), score(fnode => containsRegex(registerFormAttrRegex, fnode.element.form, form => form.id)), {name: "formHasRegisteryId"}),
      rule(type("new"), score(fnode => containsRegex(registerFormAttrRegex, fnode.element.form, form => form.name)), {name: "formHasRegisteryName"}),
      rule(type("new"), score(fnode => containsRegex(registerFormAttrRegex, fnode.element.form, form => form.className)), {name: "formHasRegisteryClass"}),
      rule(type("new"), score(fnode => containsRegex(registerActionRegex, fnode.element.form, form => form.action)), {name: "formHasRegisteryAction"}),
      rule(type("new"), score(fnode => containsRegex(loginFormAttrRegex, fnode.element.form, form => form.id)), {name: "formHasLoginyId"}),
      rule(type("new"), score(fnode => containsRegex(loginFormAttrRegex, fnode.element.form, form => form.name)), {name: "formHasLoginyName"}),
      rule(type("new"), score(fnode => containsRegex(loginFormAttrRegex, fnode.element.form, form => form.className)), {name: "formHasLoginyClass"}),
      rule(type("new"), score(fnode => containsRegex(loginRegex, fnode.element.form, form => form.action)), {name: "formHasLoginyAction"}),
      rule(type("new"), score(fnode => testFormButtonsAgainst(fnode.element, registerStringRegex)), {name: "formButtonIsRegistery"}),
      rule(type("new"), score(fnode => testFormButtonsAgainst(fnode.element, loginRegex)), {name: "formButtonIsLoginy"}),
      rule(type("new"), score(hasAutocompleteCurrentPassword), {name: "hasAutocompleteCurrentPassword"}),
      rule(type("new"), score(fnode => hasSomeMatchingPredicateForSelectorWithinElement(fnode.element.form, "input[type=checkbox]", checkbox => rememberMeAttrRegex.test(checkbox.id) || rememberMeAttrRegex.test(checkbox.name))), {name: "formHasRememberMeCheckbox"}),
      rule(type("new"), score(fnode => hasSomeMatchingPredicateForSelectorWithinElement(fnode.element.form, "label", label => rememberMeStringRegex.test(label.textContent))), {name: "formHasRememberMeLabel"}),
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
