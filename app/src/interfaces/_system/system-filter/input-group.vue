<template>
	<template
		v-if="
			[
				'_eq',
				'_neq',
				'_lt',
				'_gt',
				'_lte',
				'_gte',
				'_contains',
				'_ncontains',
				'_starts_with',
				'_nstarts_with',
				'_ends_with',
				'_nends_with',
			].includes(getComparator(field))
		"
	>
		<input-component :is="interfaceType" :type="fieldInfo.type" :value="value" @input="value = $event" />
	</template>

	<div
		v-else-if="['_in', '_nin'].includes(getComparator(field))"
		class="list"
		:class="{ moveComma: interfaceType === 'interface-input' }"
	>
		<div v-for="(val, index) in value" :key="index" class="value">
			<input-component :is="interfaceType" :type="fieldInfo.type" :value="val" @input="setValueAt(index, $event)" />
		</div>
	</div>

	<template v-else-if="['_between', '_nbetween'].includes(getComparator(field))" class="between">
		<input-component :is="interfaceType" :type="fieldInfo.type" :value="value[0]" @input="setValueAt(0, $event)" />
		<div class="and">{{ t('interfaces.filter.and') }}</div>
		<input-component :is="interfaceType" :type="fieldInfo.type" :value="value[1]" @input="setValueAt(1, $event)" />
	</template>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from 'vue';
import { useFieldsStore } from '@/stores';
import { useI18n } from 'vue-i18n';
import { clone, get } from 'lodash';
import InputComponent from './input-component.vue';
import { FieldFilter } from '@directus/shared/types';
import { fieldToFilter, getComparator, getField } from './utils';

export default defineComponent({
	components: { InputComponent },
	props: {
		field: {
			type: Object as PropType<FieldFilter>,
			required: true,
		},
		collection: {
			type: String,
			required: true,
		},
	},
	emits: ['update:field'],
	setup(props, { emit }) {
		const fieldsStore = useFieldsStore();
		const { t } = useI18n();

		const fieldInfo = computed(() => {
			return fieldsStore.getField(props.collection, getField(props.field));
		});

		const interfaceType = computed(() => {
			const types: Record<string, string> = {
				bigInteger: 'input',
				binary: 'input',
				boolean: 'boolean',
				date: 'datetime',
				dateTime: 'datetime',
				decimal: 'input',
				float: 'input',
				integer: 'input',
				json: 'input-code',
				string: 'input',
				text: 'input-multiline',
				time: 'datetime',
				timestamp: 'datetime',
				uuid: 'input',
				csv: 'input',
				hash: 'input-hash',
				geometry: 'map',
			};

			return 'interface-' + types[fieldInfo.value?.type || 'string'];
		});

		const value = computed<any | any[]>({
			get() {
				const fieldPath = getField(props.field);
				const comparator = getComparator(props.field);

				const value = get(props.field, `${fieldPath}.${comparator}`);
				if (['_in', '_nin'].includes(getComparator(props.field))) {
					return [...(value as string[]).filter((val) => val !== null && val !== ''), null];
				} else {
					return value;
				}
			},
			set(newVal) {
				const fieldPath = getField(props.field);
				const comparator = getComparator(props.field);

				let value;

				if (['_in', '_nin'].includes(comparator)) {
					value = (newVal as string[]).filter((val) => val !== null && val !== '');
				} else {
					value = newVal;
				}
				emit('update:field', fieldToFilter(fieldPath, comparator, value));
			},
		});

		function setValueAt(index: number, newVal: any) {
			let newArray = Array.isArray(value.value) ? clone(value.value) : new Array(index + 1);
			newArray[index] = newVal;
			value.value = newArray;
		}

		return { t, fieldInfo, interfaceType, value, setValueAt, getComparator };
	},
});
</script>

<style lang="scss" scoped>
.value {
	display: flex;
	align-items: center;

	.v-icon {
		margin-right: 8px;
		margin-left: 12px;
		color: var(--foreground-subdued);
		cursor: pointer;

		&:hover {
			color: var(--danger);
		}
	}
}

.list {
	display: flex;

	.value:not(:last-child)::after {
		margin-right: 6px;
		content: ',';
	}

	&.moveComma .value:not(:last-child)::after {
		margin: 0 8px 0 -6px;
	}
}

.and {
	margin: 0px 8px;
}
</style>
