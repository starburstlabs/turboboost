/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
this.Turboboost = {
  insertErrors: false,
  defaultError: "Sorry, there was an error."
};

const turboboostable = "[data-turboboost]";
const errID = "#error_explanation";
const errTemplate = errors => `<ul><li>${$.makeArray(errors).join('</li><li>')}</li></ul>`;

const enableForm = $form => $form.find("[type='submit']").removeAttr('disabled');

const disableForm = $form => $form.find("[type='submit']").attr('disabled', 'disabled');

const tryJSONParse = function(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
};

const turboboostFormError = function(e, errors) {
  if (!Turboboost.insertErrors) { return; }
  errors = tryJSONParse(errors);
  if (!errors.length) { errors = [Turboboost.defaultError]; }
  const $form = $(e.target);
  let $el = $form.find(errID);
  if (!$el.length) {
    $el = $(`<div id='${errID.substr(1)}'></div>`);
    switch (Turboboost.insertErrors) {
      case "append": $form.append($el); break;
      case "beforeSubmit": $form.find("[type='submit']").before($el); break;
      case "afterSubmit": $form.find("[type='submit']").after($el); break;
      case true: $form.prepend($el); break;
      default:
        if (Turboboost.insertErrors.match(/^\W+/)) {
          $form.find(Turboboost.insertErrors).html($el);
        } else {
          $form.prepend($el);
        }
    }
  }
  return $el.html(errTemplate(errors));
};

const turboboostComplete = function(e, resp) {
  const $el = $(this);
  const isForm = this.nodeName === "FORM";

  if (Array.from(__range__(200, 299, true)).includes(resp.status)) {
    let location;
    $el.trigger("turboboost:success", tryJSONParse(resp.getResponseHeader('X-Flash')));
    if (Turboboost.insertErrors && isForm) { $el.find(errID).remove(); }
    if ((location = resp.getResponseHeader('Location')) && !$el.attr('data-no-turboboost-redirect')) {
      Turbolinks.visit(location);
    } else {
      if (isForm) { enableForm($el); }
      maybeInsertSuccessResponseBody(resp);
    }
  }

  if (Array.from(__range__(400, 599, true)).includes(resp.status)) {
    if (isForm) { enableForm($el); }
    $el.trigger("turboboost:error", resp.responseText);
  }

  return $el.trigger("turboboost:complete");
};

const turboboostBeforeSend = function(e, xhr, settings) {
  xhr.setRequestHeader('X-Turboboost', '1');
  const isForm = this.nodeName === "FORM";
  if (!isForm) { return e.stopPropagation(); }
  const $el = $(this);
  disableForm($el);
  if ((settings.type === "GET") && !$el.attr('data-no-turboboost-redirect')) {
    Turbolinks.visit([this.action, $el.serialize()].join("?"));
    return false;
  }
};

var maybeInsertSuccessResponseBody = function(resp) {
  let scope;
  if (scope = resp.getResponseHeader('X-Within')) {
    return $(scope).html(resp.responseText);
  } else if (scope = resp.getResponseHeader('X-Replace')) {
    return $(scope).replaceWith(resp.responseText);
  } else if (scope = resp.getResponseHeader('X-Append')) {
    return $(scope).append(resp.responseText);
  } else if (scope = resp.getResponseHeader('X-Prepend')) {
    return $(scope).prepend(resp.responseText);
  } else if (scope = resp.getResponseHeader('X-Before')) {
    return $(scope).before(resp.responseText);
  } else if (scope = resp.getResponseHeader('X-After')) {
    return $(scope).after(resp.responseText);
  }
};

$(document)
  .on("ajax:beforeSend", turboboostable, turboboostBeforeSend)
  .on("ajax:complete", turboboostable, turboboostComplete)
  .on("turboboost:error", `form${turboboostable}`, turboboostFormError);

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}