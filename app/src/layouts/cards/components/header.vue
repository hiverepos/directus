<template>
	<div class="cards-header">
		<div class="start">
			<div v-if="internalSelection.length > 0" class="selected" @click="internalSelection = []">
				<v-icon name="cancel" outline />
				<span class="label">{{ t('n_items_selected', internalSelection.length) }}</span>
			</div>
			<button v-else class="select-all" @click="$emit('select-all')">
				<v-icon name="check_circle" outline />
				<span class="label">{{ t('select_all') }}</span>
			</button>
		</div>
		<div class="end">
			<v-icon
				v-tooltip.top="t('card_size')"
				class="size-selector"
				:name="`grid_${7 - size}`"
				clickable
				@click="toggleSize"
			/>

			<v-menu show-arrow placement="bottom">
				<template #activator="{ toggle }">
					<div v-tooltip.top="t('sort_field')" class="sort-selector" @click="toggle">
						{{ sortField && sortField.name }}
					</div>
				</template>

				<v-list>
					<v-list-item
						v-for="field in fieldsWithoutFake"
						:key="field.field"
						:disabled="field.disabled"
						:active="field.field === sortKey"
						clickable
						@click="internalSort = field.field"
					>
						<v-list-item-content>{{ field.name }}</v-list-item-content>
					</v-list-item>
				</v-list>
			</v-menu>
			<v-icon
				v-tooltip.top="t('sort_direction')"
				class="sort-direction"
				:class="{ descending }"
				name="sort"
				clickable
				@click="toggleDescending"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';
import { defineComponent, PropType, computed } from 'vue';
import { Field } from '@directus/shared/types';
import { useSync } from '@directus/shared/composables';

export default defineComponent({
	props: {
		fields: {
			type: Array as PropType<Field[]>,
			required: true,
		},
		size: {
			type: Number,
			required: true,
		},
		sort: {
			type: String,
			required: true,
		},
		selection: {
			type: Array as PropType<Record<string, any>>,
			default: () => [],
		},
	},
	emits: ['select-all', 'update:size', 'update:sort', 'update:selection'],
	setup(props, { emit }) {
		const { t } = useI18n();

		const internalSize = useSync(props, 'size', emit);
		const internalSort = useSync(props, 'sort', emit);
		const internalSelection = useSync(props, 'selection', emit);
		const descending = computed(() => props.sort.startsWith('-'));

		const sortKey = computed(() => (props.sort.startsWith('-') ? props.sort.substring(1) : props.sort));

		const sortField = computed(() => {
			return props.fields.find((field) => field.field === sortKey.value);
		});

		const fieldsWithoutFake = computed(() => {
			return props.fields
				.filter((field) => field.field.startsWith('$') === false)
				.map((field) => ({
					field: field.field,
					name: field.name,
					disabled: ['json', 'o2m', 'm2o', 'm2a', 'file', 'files', 'alias', 'presentation'].includes(field.type),
				}));
		});

		return {
			t,
			toggleSize,
			descending,
			toggleDescending,
			sortField,
			internalSize,
			internalSort,
			internalSelection,
			sortKey,
			fieldsWithoutFake,
		};

		function toggleSize() {
			if (props.size >= 2 && props.size < 5) {
				internalSize.value++;
			} else {
				internalSize.value = 2;
			}
		}

		function toggleDescending() {
			if (descending.value === true) {
				internalSort.value = internalSort.value.substring(1);
			} else {
				internalSort.value = '-' + internalSort.value;
			}
		}
	},
});
</script>

<style lang="scss" scoped>
.cards-header {
	position: sticky;
	top: var(--layout-offset-top);
	z-index: 4;
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	height: 52px;
	margin-bottom: 36px;
	padding: 0 8px;
	background-color: var(--background-page);
	border-top: var(--border-width) solid var(--border-subdued);
	border-bottom: var(--border-width) solid var(--border-subdued);
	box-shadow: 0 0 0 2px var(--background-page);
}

.start {
	.label {
		display: inline-block;
		margin-left: 4px;
		transform: translateY(1px);
	}

	.select-all {
		color: var(--foreground-subdued);
		transition: color var(--fast) var(--transition);

		&:hover {
			color: var(--foreground-normal);
		}
	}

	.selected {
		cursor: pointer;
	}
}

.end {
	display: flex;
	align-items: center;
	color: var(--foreground-subdued);

	.size-selector {
		margin-right: 16px;
		transition: color var(--fast) var(--transition);

		&:hover {
			color: var(--foreground-normal);
		}
	}

	.sort-selector {
		margin-right: 8px;
		transition: color var(--fast) var(--transition);

		&:hover {
			color: var(--foreground-normal);
			cursor: pointer;
		}
	}

	.sort-direction {
		transition: color var(--fast) var(--transition);

		&.descending {
			transform: scaleY(-1);
		}

		&:hover {
			color: var(--foreground-normal);
			cursor: pointer;
		}
	}
}
</style>
