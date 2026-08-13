<#import "template.ftl" as layout>
<#import "field.ftl" as field>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password'); section>
  <#if section = "header">
    Sign in to your account
  <#elseif section = "form">
    <form id="kc-form-login" class="${properties.kcFormClass!}" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post" novalidate="novalidate">
      <#assign usernameLabel>
        <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
      </#assign>

      <@field.input
        name="username"
        label=usernameLabel
        error=messagesPerField.getFirstError('username','password')
        autofocus=true
        autocomplete="username"
        value=login.username!''
      />
      <@field.password
        name="password"
        label=msg("password")
        error=""
        forgotPassword=false
        autocomplete="current-password"
      />

      <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>

      <div class="cms-login-actions">
        <button id="kc-login" name="login" type="submit">Login</button>
        <#if realm.resetPasswordAllowed>
          <a class="cms-forgot-password" href="${url.loginResetCredentialsUrl}">Passwort vergessen</a>
        </#if>
      </div>
    </form>
  </#if>
</@layout.registrationLayout>
