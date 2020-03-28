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
    ["hasNewLabel", 1.0912284851074219],
    ["hasConfirmLabel", 0.949703574180603],
    ["hasCurrentLabel", -1.2386627197265625],
    ["closestLabelMatchesNew", 1.2303366661071777],
    ["closestLabelMatchesConfirm", 0.8884114027023315],
    ["closestLabelMatchesCurrent", -1.502377986907959],
    ["hasNewAriaLabel", 1.213594913482666],
    ["hasConfirmAriaLabel", 1.0266947746276855],
    ["hasCurrentAriaLabel", -0.5412404537200928],
    ["hasNewPlaceholder", 1.0097733736038208],
    ["hasConfirmPlaceholder", 0.8488461971282959],
    ["hasCurrentPlaceholder", -1.347542643547058],
    ["forgotPasswordInFormLinkTextContent", -0.5887588858604431],
    ["forgotPasswordInFormLinkHref", -0.7897790670394897],
    ["forgotPasswordInFormLinkTitle", -1.582519769668579],
    ["forgotInFormLinkTextContent", -0.8725351095199585],
    ["forgotInFormLinkHref", -0.15872822701931],
    ["forgotPasswordInFormButtonTextContent", -1.5995596647262573],
    ["forgotPasswordOnPageLinkTextContent", -1.1192532777786255],
    ["forgotPasswordOnPageLinkHref", -0.18509335815906525],
    ["forgotPasswordOnPageLinkTitle", 0.2235572636127472],
    ["forgotPasswordOnPageButtonTextContent", 0.6364014744758606],
    ["idMatchesNew", 1.0698245763778687],
    ["nameMatchesNew", 0.9785923957824707],
    ["classMatchesNew", 1.3311240673065186],
    ["idMatchesConfirm", 0.7148358225822449],
    ["nameMatchesConfirm", 0.8018974661827087],
    ["classMatchesConfirm", 0.8568037152290344],
    ["idMatchesCurrent", -1.3470752239227295],
    ["nameMatchesCurrent", -0.8864232301712036],
    ["classMatchesCurrent", 0.05023294687271118],
    ["idMatchesOne", 0.7743728160858154],
    ["nameMatchesOne", 0.6904774308204651],
    ["classMatchesOne", 0.7976001501083374],
    ["idMatchesTwo", 0.39248180389404297],
    ["nameMatchesTwo", 0.738287627696991],
    ["classMatchesTwo", -0.06596855074167252],
    ["idMatchesLogin", -1.3631227016448975],
    ["nameMatchesLogin", 1.9583814144134521],
    ["classMatchesLogin", -1.5002772808074951],
    ["formHasRegisteryId", 1.1450074911117554],
    ["formHasRegisteryName", 1.0973204374313354],
    ["formHasRegisteryClass", 0.7995884418487549],
    ["formHasRegisteryAction", 1.0817958116531372],
    ["formHasLoginyId", -0.7420071959495544],
    ["formHasLoginyName", -1.1559255123138428],
    ["formHasLoginyClass", -0.37638425827026367],
    ["formHasLoginyAction", -0.46626168489456177],
    ["formButtonIsRegistery", 1.2065483331680298],
    ["formButtonIsLoginy", -1.491477370262146],
    ["hasAutocompleteCurrentPassword", -1.8561248779296875],
    ["formHasRememberMeCheckbox", -0.14150239527225494],
    ["formHasRememberMeLabel", -0.35947301983833313],
  ]
};

const biases = [
  ["new", 1.1701308488845825]
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
const oneAttrRegex = /1|one|first/i;
const twoAttrRegex = /2|two|second/i;
const loginRegex = /login|Войти|sign in|ورود|登录|Přihlásit se|Авторизоваться|signin|log in|sign\/in|sign-in|entrar|ログイン|로그인|Anmelden|inloggen|Συνδέσου|accedi|ログオン|Giriş Yap|登入|connecter/i;
const loginFormAttrRegex = /login|signin|sign-in/i;
const registerButtonRegex = /create account|Zugang anlegen|Angaben prüfen|Konto erstellen|register|sign up|create an account|create my account|ثبت نام|登録|注册|Cadastrar|Зарегистрироваться|Bellige alynmak|تسجيل|Registrovat|ΕΓΓΡΑΦΗΣ|Εγγραφή|REGISTRARME|Registrarse|Créer mon compte|Mendaftar|Registrazione|Registrati|가입하기|inschrijving|Zarejestruj się|Deschideți un cont|Создать аккаунт|ร่วม|Üye Ol|create new account/i;
const registerActionRegex = /register|signup|sign-up|create-account|account\/create|join|new_account|user\/create|sign\/up|membership\/create/i;
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
      rule(type("new"), score(fnode => newAttrRegex.test(fnode.element.id)), {name: "idMatchesNew"}),
      rule(type("new"), score(fnode => newAttrRegex.test(fnode.element.name)), {name: "nameMatchesNew"}),
      rule(type("new"), score(fnode => newAttrRegex.test(fnode.element.className)), {name: "classMatchesNew"}),
      rule(type("new"), score(fnode => confirmAttrRegex.test(fnode.element.id)), {name: "idMatchesConfirm"}),
      rule(type("new"), score(fnode => confirmAttrRegex.test(fnode.element.name)), {name: "nameMatchesConfirm"}),
      rule(type("new"), score(fnode => confirmAttrRegex.test(fnode.element.className)), {name: "classMatchesConfirm"}),
      rule(type("new"), score(fnode => currentAttrAndStringRegex.test(fnode.element.id)), {name: "idMatchesCurrent"}),
      rule(type("new"), score(fnode => currentAttrAndStringRegex.test(fnode.element.name)), {name: "nameMatchesCurrent"}),
      rule(type("new"), score(fnode => currentAttrAndStringRegex.test(fnode.element.className)), {name: "classMatchesCurrent"}),
      rule(type("new"), score(fnode => oneAttrRegex.test(fnode.element.id)), {name: "idMatchesOne"}),
      rule(type("new"), score(fnode => oneAttrRegex.test(fnode.element.name)), {name: "nameMatchesOne"}),
      rule(type("new"), score(fnode => oneAttrRegex.test(fnode.element.className)), {name: "classMatchesOne"}),
      rule(type("new"), score(fnode => twoAttrRegex.test(fnode.element.id)), {name: "idMatchesTwo"}),
      rule(type("new"), score(fnode => twoAttrRegex.test(fnode.element.name)), {name: "nameMatchesTwo"}),
      rule(type("new"), score(fnode => twoAttrRegex.test(fnode.element.className)), {name: "classMatchesTwo"}),
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
