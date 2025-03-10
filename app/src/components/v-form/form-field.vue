<template>
	<div :key="field.field" class="field" :class="[field.meta?.width || 'full', { invalid: validationError }]">
		<v-menu v-if="field.hideLabel !== true" placement="bottom-start" show-arrow :disabled="isDisabled">
			<template #activator="{ toggle, active }">
				<form-field-label
					:field="field"
					:toggle="toggle"
					:active="active"
					:disabled="isDisabled"
					:batch-mode="batchMode"
					:batch-active="batchActive"
					:edited="isEdited"
					:has-error="!!validationError"
					:badge="badge"
					:loading="loading"
					@toggle-batch="$emit('toggle-batch', $event)"
				/>
			</template>

			<form-field-menu
				:field="field"
				:model-value="internalValue"
				:initial-value="initialValue"
				@update:model-value="emitValue($event)"
				@unset="$emit('unset', $event)"
				@edit-raw="showRaw = true"
			/>
		</v-menu>
		<div v-else-if="['full', 'fill'].includes(field.meta && field.meta.width) === false" class="label-spacer" />

		<form-field-interface
			:autofocus="autofocus"
			:model-value="internalValue"
			:field="field"
			:loading="loading"
			:batch-mode="batchMode"
			:batch-active="batchActive"
			:disabled="isDisabled"
			:primary-key="primaryKey"
			@update:model-value="emitValue($event)"
		/>

		<v-dialog v-model="showRaw" @esc="showRaw = false">
			<v-card>
				<v-card-title>{{ t('edit_raw_value') }}</v-card-title>
				<v-card-text>
					<v-textarea v-model="rawValue" class="raw-value" :placeholder="t('enter_raw_value')" />
				</v-card-text>
				<v-card-actions>
					<v-button @click="showRaw = false">{{ t('done') }}</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<small v-if="field.meta && field.meta.note" v-md="field.meta.note" class="type-note" />

		<small v-if="validationError" class="validation-error">
			{{ validationMessage }}
		</small>
	</div>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';
import { defineComponent, PropType, computed, ref } from 'vue';
import { Field, ValidationError } from '@directus/shared/types';
import FormFieldLabel from './form-field-label.vue';
import FormFieldMenu from './form-field-menu.vue';
import FormFieldInterface from './form-field-interface.vue';
import { getJSType } from '@/utils/get-js-type';
import { isEqual } from 'lodash';

export default defineComponent({
	components: { FormFieldLabel, FormFieldMenu, FormFieldInterface },
	props: {
		field: {
			type: Object as PropType<Field>,
			required: true,
		},
		batchMode: {
			type: Boolean,
			default: false,
		},
		batchActive: {
			type: Boolean,
			default: false,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		modelValue: {
			type: [String, Number, Object, Array, Boolean],
			default: undefined,
		},
		initialValue: {
			type: [String, Number, Object, Array, Boolean],
			default: undefined,
		},
		primaryKey: {
			type: [String, Number],
			default: null,
		},
		loading: {
			type: Boolean,
			default: false,
		},
		validationError: {
			type: Object as PropType<ValidationError>,
			default: null,
		},
		autofocus: {
			type: Boolean,
			default: false,
		},
		badge: {
			type: String,
			default: null,
		},
	},
	emits: ['toggle-batch', 'unset', 'update:modelValue'],
	setup(props, { emit }) {
		const { t } = useI18n();

		const isDisabled = computed(() => {
			if (props.disabled) return true;
			if (props.field?.meta?.readonly === true) return true;
			if (props.batchMode && props.batchActive === false) return true;
			return false;
		});

		const defaultValue = computed(() => {
			const value = props.field?.schema?.default_value;

			if (value !== undefined) return value;
			return undefined;
		});

		const internalValue = computed(() => {
			if (props.modelValue !== undefined) return props.modelValue;
			if (props.initialValue !== undefined) return props.initialValue;
			return defaultValue.value;
		});

		const isEdited = computed<boolean>(() => {
			return props.modelValue !== undefined && isEqual(props.modelValue, props.initialValue) === false;
		});

		const { showRaw, rawValue } = useRaw();

		const validationMessage = computed(() => {
			if (!props.validationError) return null;

			if (props.validationError.code === 'RECORD_NOT_UNIQUE') {
				return t('validationError.unique');
			} else {
				return t(`validationError.${props.validationError.type}`, props.validationError);
			}
		});

		return { t, isDisabled, internalValue, emitValue, showRaw, rawValue, validationMessage, isEdited };

		function emitValue(value: any) {
			if (
				(isEqual(value, props.initialValue) ||
					(props.initialValue === undefined && isEqual(value, defaultValue.value))) &&
				props.batchMode === false
			) {
				emit('unset', props.field);
			} else {
				emit('update:modelValue', value);
			}
		}

		function useRaw() {
			const showRaw = ref(false);

			const type = computed(() => {
				return getJSType(props.field.type);
			});

			const rawValue = computed({
				get() {
					switch (type.value) {
						case 'object':
							return JSON.stringify(internalValue.value, null, '\t');
						case 'string':
						case 'number':
						case 'boolean':
						default:
							return internalValue.value;
					}
				},
				set(newRawValue: string) {
					switch (type.value) {
						case 'string':
							emit('update:modelValue', newRawValue);
							break;
						case 'number':
							emit('update:modelValue', Number(newRawValue));
							break;
						case 'boolean':
							emit('update:modelValue', newRawValue === 'true');
							break;
						case 'object':
							emit('update:modelValue', JSON.parse(newRawValue));
							break;
						default:
							emit('update:modelValue', newRawValue);
							break;
					}
				},
			});

			return { showRaw, rawValue };
		}
	},
});
</script>

<style lang="scss" scoped>
.field {
	position: relative;
}

.type-note {
	position: relative;
	display: block;
	max-width: 520px;
	margin-top: 4px;
}

.invalid {
	margin: -12px;
	padding: 12px;
	background-color: var(--danger-alt);
	border-radius: var(--border-radius);
	transition: var(--medium) var(--transition);
	transition-property: background-color, padding, margin;
}

.validation-error {
	display: block;
	margin-top: 4px;
	color: var(--danger);
	font-style: italic;
}

.raw-value {
	--v-textarea-font-family: var(--family-monospace);
}

.label-spacer {
	height: 28px;
}
</style>
