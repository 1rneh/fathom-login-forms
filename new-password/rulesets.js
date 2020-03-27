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
    ["hasNewLabel", 1.1475578546524048],
    ["hasConfirmLabel", 1.1088526248931885],
    ["closestLabelMatchesNew", 1.498863935470581],
    ["closestLabelMatchesConfirm", 0.9556789994239807],
    ["hasNewAriaLabel", 1.2129756212234497],
    ["hasConfirmAriaLabel", 1.2947739362716675],
    ["hasNewPlaceholder", 0.8625594973564148],
    ["hasConfirmPlaceholder", 0.8333195447921753],
    ["forgotPasswordInFormLinkInnerText", -0.5628496408462524],
    ["forgotPasswordInFormLinkHref", -1.0719348192214966],
    ["forgotPasswordInFormLinkTitle", -2.0197055339813232],
    ["forgotInFormLinkInnerText", -0.8784432411193848],
    ["forgotInFormLinkHref", -0.29903921484947205],
    ["forgotPasswordInFormButtonInnerText", -1.7987523078918457],
    ["forgotPasswordOnPageLinkInnerText", -1.4977914094924927],
    ["forgotPasswordOnPageLinkHref", 0.19559451937675476],
    ["forgotPasswordOnPageLinkTitle", 0.3964155614376068],
    ["forgotPasswordOnPageButtonInnerText", 0.28442490100860596],
    ["idIsPassword1Or2", 0.9458191990852356],
    ["nameIsPassword1Or2", 0.9060004949569702],
    ["idMatchesLogin", -1.4721583127975464],
    ["nameMatchesLogin", 2.4809982776641846],
    ["classMatchesLogin", -1.891852855682373],
    ["formHasRegisteryId", 1.226690649986267],
    ["formHasRegisteryName", 1.2698602676391602],
    ["formHasRegisteryClass", 0.7578275203704834],
    ["formHasRegisteryAction", 1.3507407903671265],
    ["formHasLoginyId", -0.9361934661865234],
    ["formHasLoginyName", -1.4802566766738892],
    ["formHasLoginyClass", -0.38017258048057556],
    ["formHasLoginyAction", -0.5359786748886108],
    ["formButtonIsRegistery", 1.449123740196228],
    ["formButtonIsLoginy", -1.7515889406204224],
    ["hasAutocompleteCurrentPassword", -1.8347175121307373],
    ["formHasRememberMeCheckbox", -0.39118412137031555],
    ["formHasRememberMeLabel", -1.0628185272216797],
  ]
};

const biases = [
  ["new", 1.4772255420684814]
];

const passwordRegex = /password|passwort|رمز عبور|mot de passe|パスワード|비밀번호|암호|wachtwoord|senha|Пароль|parol|密码|contraseña|heslo|كلمة السر|kodeord|Κωδικός|pass code|Kata sandi|hasło|รหัสผ่าน|Şifre/i;
const newRegex = /erstellen|create|choose|設定|신규/i;
const confirmRegex = /wiederholen|wiederholung|confirm|repeat|confirmation|verify|retype|repite|確認|の確認|تکرار|re-enter|확인|bevestigen|confirme|Повторите|tassyklamak|再次输入|ještě jednou|gentag|re-type|confirmar|Répéter|conferma|Repetaţi/i;
const forgotInnerTextRegex = /vergessen|vergeten|forgot|oublié|dimenticata|Esqueceu|esqueci|Забыли|忘记|找回|Zapomenuté|lost|忘れた|忘れられた|忘れの方|재설정|찾기|help|فراموشی| را فراموش کرده اید|Восстановить|Unuttu|perdus|重新設定|reset|recover|change|remind|find|request|restore|trouble/i;
const forgotHrefRegex = /forgot|reset|recover|change|lost|remind|find|request|restore/i;
const password1Or2Regex = /password1|password2/i;
const passwordyRegex = /pw|pwd|passwd|pass/i;
const loginRegex = /login|Войти|sign in|ورود|登录|Přihlásit se|Авторизоваться|signin|log in|sign\/in|sign-in|entrar|ログイン|로그인|Anmelden|inloggen|Συνδέσου|accedi|ログオン|Giriş Yap|登入|connecter/i;
const registerButtonRegex = /create account|Zugang anlegen|Angaben prüfen|Konto erstellen|register|sign up|create an account|create my account|ثبت نام|登録|注册|Cadastrar|Зарегистрироваться|Bellige alynmak|تسجيل|Registrovat|ΕΓΓΡΑΦΗΣ|Εγγραφή|REGISTRARME|Registrarse|Créer mon compte|Mendaftar|Registrazione|Registrati|가입하기|inschrijving|Zarejestruj się|Deschideți un cont|Создать аккаунт|ร่วม|Üye Ol|create new account/i;
const registerActionRegex = /register|signup|sign-up|create-account|account\/create|join|new_account|user\/create|sign\/up|membership\/create/i;
const loginFormAttrRegex = /login|signin|sign-in/i;
const registerFormAttrRegex = /signup|join|register|regform|registration|new_user|AccountCreate|create_customer|CreateAccount|CreateAcct|create-account|reg-form|newuser|new-reg|new-form|new_membership/i;
const rememberMeAttrRegex = /remember|auto_login|auto-login|memory|save_mail|save-mail|idsave|idRmb|id_save|id-save|save_id|save-id|ricordami|manter|mantenha|savelogin|auto login/i;
const rememberMeStringRegex = /remember me|keep me logged in|keep me signed in|save email address|save id|stay signed in|ricordami|次回からログオンIDの入力を省略する|メールアドレスを保存する|を保存|아이디저장|아이디 저장|로그인 상태 유지|lembrar|manter conectado|mantenha-me conectado|Запомни меня|запомнить меня|Запомните меня|Не спрашивать в следующий раз|下次自动登录|记住我/i;

function makeRuleset(coeffs, biases) {
  function hasLabelMatchingRegex(element, regex) {
    // Check element.labels
    const labels = element.labels;
    // TODO: Should I be concerned with multiple labels?
    if (labels !== null && labels.length > 0) {
      return regex.test(labels[0].innerText);
    }

    // Check element.aria-labelledby
    let labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy !== null) {
      labelledBy = labelledBy.split(" ").map(id => element.ownerDocument.getElementById(id));
      if (labelledBy.length === 1) {
        return regex.test(labelledBy[0].innerText);
      } else if (labelledBy.length > 1) {
        return regex.test(min(labelledBy, node => euclidean(node, element)).innerText);
      }
    }

    const parentElement = element.parentElement;
    // Check if the input is in a <td>, and, if so, check the innerText of the containing <tr>
    if (parentElement.tagName === "TD") {
      // TODO: How bad is the assumption that the <tr> won't be the parent of the <td>?
      return regex.test(parentElement.parentElement.innerText);
    }

    // Check if the input is in a <dd>, and, if so, check the innerText of the preceding <dt>
    if (parentElement.tagName === "DD") {
      return regex.test(parentElement.previousElementSibling.innerText);
    }
    return false;
  }

  function closestLabelMatchesRegex(element, regex) {
    const previousElementSibling = element.previousElementSibling;
    if (previousElementSibling !== null && previousElementSibling.tagName === "LABEL") {
      return regex.test(previousElementSibling.innerText);
    }

    const nextElementSibling = element.nextElementSibling;
    if (nextElementSibling !== null && nextElementSibling.tagName === "LABEL") {
      return regex.test(nextElementSibling.innerText);
    }

    const closestLabelWithinForm = closestSelectorElementWithinElement(element, element.form, "label");
    return containsRegex(regex, closestLabelWithinForm, closestLabelWithinForm => closestLabelWithinForm.innerText);
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
        return stringRegex.test(button.value) || stringRegex.test(button.innerText) || stringRegex.test(button.id) || stringRegex.test(button.title);
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
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("innerText", fnode.element.form, passwordRegex, forgotInnerTextRegex)), {name: "forgotPasswordInFormLinkInnerText"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("href", fnode.element.form, (new RegExp(passwordRegex.source + "|" + passwordyRegex.source, "i")), forgotHrefRegex)), {name: "forgotPasswordInFormLinkHref"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("title", fnode.element.form, passwordRegex, forgotInnerTextRegex)), {name: "forgotPasswordInFormLinkTitle"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("innerText", fnode.element.form, forgotInnerTextRegex)), {name: "forgotInFormLinkInnerText"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("href", fnode.element.form, forgotHrefRegex)), {name: "forgotInFormLinkHref"}),
      rule(type("new"), score(fnode => hasSomeMatchingPredicateForSelectorWithinElement(fnode.element.form, "button", button => textContentMatchesRegexes(button, passwordRegex, forgotInnerTextRegex))), {name: "forgotPasswordInFormButtonTextContent"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("innerText", fnode.element.ownerDocument, passwordRegex, forgotInnerTextRegex)), {name: "forgotPasswordOnPageLinkInnerText"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("href", fnode.element.ownerDocument, (new RegExp(passwordRegex.source + "|" + passwordyRegex.source, "i")), forgotHrefRegex)), {name: "forgotPasswordOnPageLinkHref"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("title", fnode.element.ownerDocument, passwordRegex, forgotInnerTextRegex)), {name: "forgotPasswordOnPageLinkTitle"}),
      rule(type("new"), score(fnode => hasSomeMatchingPredicateForSelectorWithinElement(fnode.element.ownerDocument, "button", button => textContentMatchesRegexes(button, passwordRegex, forgotInnerTextRegex))), {name: "forgotPasswordOnPageButtonTextContent"}),
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
      rule(type("new"), score(fnode => testFormButtonsAgainst(fnode.element, registerButtonRegex)), {name: "formButtonIsRegistery"}),
      rule(type("new"), score(fnode => testFormButtonsAgainst(fnode.element, loginRegex)), {name: "formButtonIsLoginy"}),
      rule(type("new"), score(hasAutocompleteCurrentPassword), {name: "hasAutocompleteCurrentPassword"}),
      rule(type("new"), score(fnode => hasSomeMatchingPredicateForSelectorWithinElement(fnode.element.form, "input[type=checkbox]", checkbox => rememberMeAttrRegex.test(checkbox.id) || rememberMeAttrRegex.test(checkbox.name))), {name: "formHasRememberMeCheckbox"}),
      rule(type("new"), score(fnode => hasSomeMatchingPredicateForSelectorWithinElement(fnode.element.form, "label", label => rememberMeStringRegex.test(label.textContent))), {name: "formHasRememberMeLabel"}),
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
