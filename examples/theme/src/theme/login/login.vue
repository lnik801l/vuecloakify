<script lang="ts" setup>
import {
	useEnvironment,
	ftlString,
	ftlBoolean,
	ftlNumber,
	ftlObjectArray,
} from "../../../../../src/runtime"

const env = useEnvironment({
	supportPhone: ftlBoolean({ field: "supportPhone", default: false }),
	rememberMe: ftlBoolean({ field: "realm.rememberMe", default: false }),
	realmName: ftlString({ field: "realm.name", debug: "master" }),
	resetPasswordAllowed: ftlBoolean({
		field: "realm.resetPasswordAllowed",
		debug: true,
	}),
	loginWithEmailAllowed: ftlBoolean({
		field: "realm.loginWithEmailAllowed",
		debug: false,
	}),
	loginWithPhoneNumber: ftlBoolean({
		field: "loginWithPhoneNumber",
		debug: false,
	}),
	registrationEmailAsUsername: ftlBoolean({
		field: "realm.registrationEmailAsUsername",
		debug: false,
	}),
	usernameHidden: ftlBoolean({ field: "usernameHidden", debug: false }),
	registrationAllowed: ftlBoolean({
		field: "realm.registrationAllowed && !registrationDisabled",
		debug: true,
	}),
	resourcesPath: ftlString({ field: "url.resourcesPath" }),
	urls: {
		loginResetCredentials: ftlString({
			field: "url.loginResetCredentialsUrl",
			debug: "/login/login-reset-password",
		}),
		registration: ftlString({
			field: "url.registrationUrl",
			debug: "/login/register",
		}),
		loginAction: ftlString({ field: "url.loginAction", default: null }),
	},
	auth: {
		username: ftlString({ field: "login.username", default: null }),
		loginRememberMe: ftlBoolean({
			field: "login.rememberMe",
			default: false,
		}),
		selectedCredential: ftlString({
			field: "auth.selectedCredential",
			default: null,
		}),
		attemptedPhoneActivated: ftlBoolean({
			field: "attemptedPhoneActivated",
			default: false,
		}),
		attemptedPhoneNumber: ftlString({
			field: "attemptedPhoneNumber",
			default: null,
		}),
	},
	errors: {
		loginPass: ftlString({
			field: "messagesPerField.getFirstError('username','password')",
			debug: "ошибка!",
		}),
		phone: ftlString({
			field: "messagesPerField.getFirstError('phoneNumber','code')",
			default: null,
		}),
	},

	social: ftlObjectArray({
		field: "social.providers",
		itemConfig: {
			alias: ftlString({ field: "alias" }),
			displayName: ftlString({ field: "displayName" }),
			loginUrl: ftlString({ field: "loginUrl" }),
		},
		debug: [
			{
				alias: "google",
				loginUrl: "/google",
				displayName: "",
			},
		],
	}),

	isUserIdentified: ftlBoolean({ field: "isUserIdentified", debug: false }),
	challenge: ftlString({
		field: "challenge",
		debug: "iU3NjVgGQ6unyBo_C61zqg",
	}),
	userVerification: ftlString({ field: "userVerification", debug: "" }),
	rpId: ftlString({ field: "authenticatorContext.rpId", debug: "" }),
	createTimeout: ftlNumber({ field: "createTimeout", debug: 10_000 }),
})
</script>

<template>
	<div class="login__page">
		<input type="text" placeholder="какой-то инпут" />
	</div>
</template>

<style lang="scss">
.login__page {
	&__buttons {
		display: flex;
		flex-direction: row;
		gap: var(--spacing-04);

		> * {
			&:first-child {
				flex-grow: 1;
			}
		}
	}

	&__meta {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		margin: var(--spacing-08) 0;

		.button {
			padding-left: 0;
			padding-right: 0;
		}
	}

	&__social {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;

		p {
			margin: 0;
			color: var(--text-secondary-color);
		}

		&__providers {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: 8px;
		}

		button {
			background: transparent;
			border: none;
			cursor: pointer;

			width: 2rem;
			height: 2rem;
			padding: 0;
			border-radius: 50%;
			padding: 0.375rem;
			box-sizing: border-box;
			border: 1px solid var(--divider-default-color);

			&:hover {
				border-color: var(--primary-hover-color);
			}

			&:active {
				border-color: var(--primary-active-color);
			}

			> svg {
				width: 100%;
				height: 100%;
			}
		}
	}
}
</style>
