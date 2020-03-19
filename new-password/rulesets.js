/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-disable import/no-unresolved */
import {dom, out, rule, ruleset, score, type} from "fathom-web";
import {euclidean} from "fathom-web/clusters";
import {identity, isVisible, min} from "fathom-web/utilsForFrontend";

// Whether this is running in the Vectorizer, rather than in-application, in a
// privileged Chrome context
const DEVELOPMENT = true;

const coefficients = {
  "new": [
    ["hasPasswordLabel", 2.6805105209350586],
    ["hasNewLabel", 0.40161967277526855],
    ["hasConfirmLabel", 2.937931537628174],
    ["hasConfirmEmailLabel", -3.157259464263916],
    ["closestLabelMatchesPassword", 0.9489457011222839],
    ["closestLabelMatchesNew", 0.5634686946868896],
    ["closestLabelMatchesConfirm", 2.4776711463928223],
    ["closestLabelMatchesConfirmEmail", -2.805655002593994],
    ["hasPasswordAriaLabel", 3.6661336421966553],
    ["hasNewAriaLabel", -0.16079507768154144],
    ["hasConfirmAriaLabel", 3.7992873191833496],
    ["hasPasswordPlaceholder", 0.2806447446346283],
    ["hasPasswordyPlaceholder", 2.161125421524048],
    ["hasNewPlaceholder", -1.0313304662704468],
    ["hasConfirmPlaceholder", 3.202808380126953],
    ["hasConfirmEmailPlaceholder", 0.10796169936656952],
    ["forgotPasswordInFormLinkInnerText", -0.4089054763317108],
    ["forgotPasswordInFormLinkHref", -1.1627658605575562],
    ["forgotPasswordInFormLinkTitle", -2.635087490081787],
    ["forgotInFormLinkInnerText", -2.1438498497009277],
    ["forgotInFormLinkHref", 0.25414010882377625],
    ["forgotPasswordInFormButtonInnerText", -3.823338031768799],
    ["forgotPasswordOnPageLinkInnerText", -1.0322209596633911],
    ["forgotPasswordOnPageLinkHref", -1.27316415309906],
    ["forgotPasswordOnPageLinkTitle", -2.033217191696167],
    ["forgotPasswordOnPageButtonInnerText", -0.4063810110092163],
    ["idIsPassword1Or2", 1.5535151958465576],
    ["nameIsPassword1Or2", 3.1262001991271973],
    ["idMatchesPassword", -0.5315209627151489],
    ["nameMatchesPassword", 0.9961035251617432],
    ["idMatchesPasswordy", 2.5149574279785156],
    ["nameMatchesPasswordy", 3.262026071548462],
    ["classMatchesPasswordy", 0.8821002840995789],
    ["idMatchesLogin", -3.8472776412963867],
    ["nameMatchesLogin", 1.9643051624298096],
    ["classMatchesLogin", -3.5098226070404053],
    ["containingFormHasLoginAction", -1.0450583696365356],
    ["containingFormHasLoginId", -1.6335563659667969],
    ["containingFormHasRegisterAction", -0.08809099346399307],
    ["formButtonIsRegistery", -0.059100907295942307],
    ["formButtonIsLoginy", -4.107572078704834],
    ["hasAutocompleteCurrentPassword", -4.785122871398926],
  ]
};

const biases = [
  ["new", -3.148810386657715]
];

const passwordRegex = /password|passwort|رمز عبور|mot de passe|パスワード|비밀번호|암호|wachtwoord|senha|Пароль|parol|密码|contraseña|heslo|كلمة السر|kodeord|Κωδικός|pass code|Kata sandi|hasło|รหัสผ่าน|Şifre/i;
const newRegex = /erstellen|create|choose|設定|신규/i;
const confirmRegex = /wiederholen|wiederholung|confirm|repeat|confirmation|verify|retype|repite|確認|の確認|تکرار|re-enter|확인|bevestigen|confirme|Повторите|tassyklamak|再次输入|ještě jednou|gentag|re-type|confirmar|Répéter|conferma|Repetaţi/i;
const emailRegex = /e-mail|email|ایمیل|メールアドレス|이메일|邮箱|البريد الإلكتروني|correo electrónico/i;
const forgotInnerTextRegex = /vergessen|vergeten|forgot|oublié|dimenticata|Esqueceu|esqueci|Забыли|忘记|找回|Zapomenuté|lost|忘れた|忘れられた|忘れの方|재설정|찾기|help|فراموشی| را فراموش کرده اید|Восстановить|Unuttu|perdus|重新設定|reset|recover|change|remind|find|request|restore|trouble/i;
const forgotHrefRegex = /forgot|reset|recover|change|lost|remind|find|request|restore/i;
const password1Or2Regex = /password1|password2/i;
const passwordyRegex = /pw|pwd|passwd|pass/i;
const loginRegex = /login|Войти|sign in|ورود|登录|Přihlásit se|Авторизоваться|signin|log in|sign\/in|sign-in|entrar|ログイン|로그인|Anmelden|inloggen|Συνδέσου|accedi|ログオン|Giriş Yap|登入|connecter/i;
const registerButtonRegex = /create account|Zugang anlegen|Angaben prüfen|Konto erstellen|register|sign up|create an account|create my account|ثبت نام|登録|注册|Cadastrar|Зарегистрироваться|Bellige alynmak|تسجيل|Registrovat|ΕΓΓΡΑΦΗΣ|Εγγραφή|REGISTRARME|Registrarse|Créer mon compte|Mendaftar|Registrazione|Registrati|가입하기|inschrijving|Zarejestruj się|Deschideți un cont|Создать аккаунт|ร่วม|Üye Ol|create new account/i;
const registerActionRegex = /register|signup|sign-up|create-account|account\/create|join|new_account|user\/create|sign\/up|membership\/create/i;


function makeRuleset(coeffs, biases) {
  /**
   * Don't bother with the fairly expensive isVisible() call when we're in
   * production. We fire only when the user clicks an <input> field. They can't
   * very well click an invisible one.
   */
  function isVisibleInDev(fnodeOrElement) {
    return DEVELOPMENT ? isVisible(fnodeOrElement) : true;
  }

  function hasConfirmLabel(fnode) {
    return hasLabelMatchingRegex(fnode.element, confirmRegex);
  }

  function hasConfirmEmailLabel(fnode) {
    return hasConfirmLabel(fnode) && hasLabelMatchingRegex(fnode.element, emailRegex);
  }

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

  function closestLabelMatchesConfirm(fnode) {
    return closestLabelMatchesRegex(fnode.element, confirmRegex);
  }

  function closestLabelMatchesConfirmEmail(fnode) {
    return closestLabelMatchesConfirm(fnode) && closestLabelMatchesRegex(fnode.element, emailRegex);
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

  function hasConfirmPlaceholder(fnode) {
    return hasPlaceholderMatchingRegex(fnode.element, confirmRegex);
  }

  function hasConfirmEmailPlaceholder(fnode) {
    return hasConfirmPlaceholder(fnode) && hasPlaceholderMatchingRegex(fnode.element, emailRegex);
  }

  function hasPlaceholderMatchingRegex(element, regex) {
    return containsRegex(regex, element.getAttribute("placeholder"));
  }

  function forgotPasswordInFormLinkInnerText(fnode) {
    return hasAnchorMatchingPredicateWithinElement(fnode.element.form, anchor => {
      return passwordRegex.test(anchor.innerText) && forgotInnerTextRegex.test(anchor.innerText);
    });
  }

  function hasAnchorMatchingPredicateWithinElement(element, matchingPredicate) {
    if (element !== null) {
      const anchors = Array.from(element.querySelectorAll('a'));
      return anchors.some(matchingPredicate);
    }
    return false;
  }

  function forgotPasswordInFormLinkHref(fnode) {
    return hasAnchorMatchingPredicateWithinElement(fnode.element.form, anchor => {
      return (passwordRegex.test(anchor.href) || passwordyRegex.test(anchor.href)) && forgotHrefRegex.test(anchor.href);
    });
  }

  function forgotPasswordInFormLinkTitle(fnode) {
    return hasAnchorMatchingPredicateWithinElement(fnode.element.form, anchor => {
      return passwordRegex.test(anchor.title) && forgotInnerTextRegex.test(anchor.title);
    });
  }

  function forgotInFormLinkInnerText(fnode) {
    return hasAnchorMatchingPredicateWithinElement(fnode.element.form, anchor => {
      return forgotInnerTextRegex.test(anchor.innerText);
    })
  }

  function forgotInFormLinkHref(fnode) {
    return hasAnchorMatchingPredicateWithinElement(fnode.element.form, anchor => {
      return forgotHrefRegex.test(anchor.href);
    })
  }

  function forgotPasswordInFormButtonInnerText(fnode) {
    const form = fnode.element.form;
    if (form !== null) {
      const buttons = Array.from(form.querySelectorAll('button'));
      return buttons.some(button => {
        return passwordRegex.test(button.innerText) && forgotInnerTextRegex.test(button.innerText);
      })
    }
    return false;
  }

  function forgotPasswordOnPageLinkInnerText(fnode) {
    return hasAnchorMatchingPredicateWithinElement(fnode.element.ownerDocument, anchor => {
      return passwordRegex.test(anchor.innerText) && forgotInnerTextRegex.test(anchor.innerText);
    })
  }

  function forgotPasswordOnPageLinkHref(fnode) {
    return hasAnchorMatchingPredicateWithinElement(fnode.element.ownerDocument, anchor => {
      return (passwordRegex.test(anchor.href) || passwordyRegex.test(anchor.href)) && forgotHrefRegex.test(anchor.href);
    });
  }

  function forgotPasswordOnPageLinkTitle(fnode) {
    return hasAnchorMatchingPredicateWithinElement(fnode.element.ownerDocument, anchor => {
      return passwordRegex.test(anchor.title) && forgotInnerTextRegex.test(anchor.title);
    });
  }

  function forgotPasswordOnPageButtonInnerText(fnode) {
    const buttons = Array.from(fnode.element.ownerDocument.querySelectorAll('button'));
    return buttons.some(button => {
      return passwordRegex.test(button.innerText) && forgotInnerTextRegex.test(button.innerText);
    });
  }

  function containingFormHasLoginAction(fnode) {
    const form = fnode.element.form;
    return containsRegex(loginRegex, form, form => form.action);
  }

  function containingFormHasLoginId(fnode) {
    const form = fnode.element.form;
    return containsRegex(loginRegex, form, form => form.id);
  }

  function containingFormHasRegisterAction(fnode) {
    const form = fnode.element.form;
    return containsRegex(registerActionRegex, form, form => form.action);
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

      let buttons = Array.from(form.querySelectorAll("button"));
      return buttons.some(button => {
        return stringRegex.test(button.value) || stringRegex.test(button.innerText) || stringRegex.test(button.id) || stringRegex.test(button.title);
      })
    }
    return false;
  }

  function hasAutocompleteCurrentPassword(fnode) {
    return fnode.element.autocomplete === "current-password";
  }

  return ruleset([
      rule(dom("input[type=text],input[type=password],input[type=\"\"],input:not([type])").when(isVisibleInDev), type("new")),
      rule(type("new"), score(fnode => hasLabelMatchingRegex(fnode.element, passwordRegex)), {name: "hasPasswordLabel"}),
      rule(type("new"), score(fnode => hasLabelMatchingRegex(fnode.element, newRegex)), {name: "hasNewLabel"}),
      rule(type("new"), score(hasConfirmLabel), {name: "hasConfirmLabel"}),
      rule(type("new"), score(hasConfirmEmailLabel), {name: "hasConfirmEmailLabel"}),
      rule(type("new"), score(fnode => closestLabelMatchesRegex(fnode.element, passwordRegex)), {name: "closestLabelMatchesPassword"}),
      rule(type("new"), score(fnode => closestLabelMatchesRegex(fnode.element, newRegex)), {name: "closestLabelMatchesNew"}),
      rule(type("new"), score(closestLabelMatchesConfirm), {name: "closestLabelMatchesConfirm"}),
      rule(type("new"), score(closestLabelMatchesConfirmEmail), {name: "closestLabelMatchesConfirmEmail"}),
      rule(type("new"), score(fnode => hasAriaLabelMatchingRegex(fnode.element, passwordRegex)), {name: "hasPasswordAriaLabel"}),
      rule(type("new"), score(fnode => hasAriaLabelMatchingRegex(fnode.element, newRegex)), {name: "hasNewAriaLabel"}),
      rule(type("new"), score(fnode => hasAriaLabelMatchingRegex(fnode.element, confirmRegex)), {name: "hasConfirmAriaLabel"}),
      rule(type("new"), score(fnode => hasPlaceholderMatchingRegex(fnode.element, passwordRegex)), {name: "hasPasswordPlaceholder"}),
      rule(type("new"), score(fnode => hasPlaceholderMatchingRegex(fnode.element, passwordyRegex)), {name: "hasPasswordyPlaceholder"}),
      rule(type("new"), score(fnode => hasPlaceholderMatchingRegex(fnode.element, newRegex)), {name: "hasNewPlaceholder"}),
      rule(type("new"), score(hasConfirmPlaceholder), {name: "hasConfirmPlaceholder"}),
      rule(type("new"), score(hasConfirmEmailPlaceholder), {name: "hasConfirmEmailPlaceholder"}),
      rule(type("new"), score(forgotPasswordInFormLinkInnerText), {name: "forgotPasswordInFormLinkInnerText"}),
      rule(type("new"), score(forgotPasswordInFormLinkHref), {name: "forgotPasswordInFormLinkHref"}),
      rule(type("new"), score(forgotPasswordInFormLinkTitle), {name: "forgotPasswordInFormLinkTitle"}),
      rule(type("new"), score(forgotInFormLinkInnerText), {name: "forgotInFormLinkInnerText"}),
      rule(type("new"), score(forgotInFormLinkHref), {name: "forgotInFormLinkHref"}),
      rule(type("new"), score(forgotPasswordInFormButtonInnerText), {name: "forgotPasswordInFormButtonInnerText"}),
      rule(type("new"), score(forgotPasswordOnPageLinkInnerText), {name: "forgotPasswordOnPageLinkInnerText"}),
      rule(type("new"), score(forgotPasswordOnPageLinkHref), {name: "forgotPasswordOnPageLinkHref"}),
      rule(type("new"), score(forgotPasswordOnPageLinkTitle), {name: "forgotPasswordOnPageLinkTitle"}),
      rule(type("new"), score(forgotPasswordOnPageButtonInnerText), {name: "forgotPasswordOnPageButtonInnerText"}),
      rule(type("new"), score(fnode => password1Or2Regex.test(fnode.element.id)), {name: "idIsPassword1Or2"}),
      rule(type("new"), score(fnode => password1Or2Regex.test(fnode.element.name)), {name: "nameIsPassword1Or2"}),
      rule(type("new"), score(fnode => passwordRegex.test(fnode.element.id)), {name: "idMatchesPassword"}),
      rule(type("new"), score(fnode => passwordRegex.test(fnode.element.name)), {name: "nameMatchesPassword"}),
      rule(type("new"), score(fnode => passwordyRegex.test(fnode.element.id)), {name: "idMatchesPasswordy"}),
      rule(type("new"), score(fnode => passwordyRegex.test(fnode.element.name)), {name: "nameMatchesPasswordy"}),
      rule(type("new"), score(fnode => passwordyRegex.test(fnode.element.className)), {name: "classMatchesPasswordy"}),
      rule(type("new"), score(fnode => loginRegex.test(fnode.element.id)), {name: "idMatchesLogin"}),
      rule(type("new"), score(fnode => loginRegex.test(fnode.element.name)), {name: "nameMatchesLogin"}),
      rule(type("new"), score(fnode => loginRegex.test(fnode.element.className)), {name: "classMatchesLogin"}),
      rule(type("new"), score(containingFormHasLoginAction), {name: "containingFormHasLoginAction"}),
      rule(type("new"), score(containingFormHasLoginId), {name: "containingFormHasLoginId"}),
      rule(type("new"), score(containingFormHasRegisterAction), {name: "containingFormHasRegisterAction"}),
      rule(type("new"), score(fnode => testFormButtonsAgainst(fnode.element, registerButtonRegex)), {name: "formButtonIsRegistery"}),
      rule(type("new"), score(fnode => testFormButtonsAgainst(fnode.element, loginRegex)), {name: "formButtonIsLoginy"}),
      rule(type("new"), score(hasAutocompleteCurrentPassword), {name: "hasAutocompleteCurrentPassword"}),
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
