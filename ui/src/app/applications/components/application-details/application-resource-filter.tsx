import * as React from 'react';
import {ApplicationTree, HealthStatusCode, SyncStatusCode} from '../../../shared/models';
import {AppDetailsPreferences, services} from '../../../shared/services';
import {Filter, FiltersGroup} from '../filter/filter';
import {ComparisonStatusIcon, HealthStatusIcon} from '../utils';

const uniq = (value: string, index: number, self: string[]) => self.indexOf(value) === index;

function toOption(label: string) {
    return {label};
}

export const Filters = (props: {pref: AppDetailsPreferences; tree: ApplicationTree; onSetFilter: (items: string[]) => void; onClearFilter: () => void}) => {
    const {pref, tree, onSetFilter} = props;

    const onClearFilter = () => {
        setLoading(true);
        props.onClearFilter();
    };

    const shown = pref.hideFilters;
    const setShown = (val: boolean) => services.viewPreferences.updatePreferences({appDetails: {...pref, hideFilters: val}});

    const resourceFilter = pref.resourceFilter || [];
    const removePrefix = (prefix: string) => (v: string) => v.replace(prefix + ':', '');

    const [groupedFilters, setGroupedFilters] = React.useState<{[key: string]: string}>({});
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const update: {[key: string]: string} = {};
        (resourceFilter || []).forEach(pair => {
            const tmp = pair.split(':');
            if (tmp.length === 2) {
                const prefix = tmp[0];
                const cur = update[prefix];
                update[prefix] = `${cur ? cur + ',' : ''}${pair}`;
            }
        });
        setGroupedFilters(update);
        setLoading(false);
    }, [resourceFilter, loading]);

    const setFilters = (prefix: string, values: string[]) => {
        const groups = {...groupedFilters};
        groups[prefix] = values.map(v => `${prefix}:${v}`).join(',');
        let strings: string[] = [];
        Object.keys(groups).forEach(g => {
            strings = strings.concat(groups[g].split(',').filter(f => f !== ''));
        });
        onSetFilter(strings);
    };

    const ResourceFilter = (p: {label: string; prefix: string; options: {label: string}[]; field?: boolean; radio?: boolean; wrap?: boolean}) => {
        return loading ? (
            <div>Loading...</div>
        ) : (
            <Filter
                label={p.label}
                selected={selectedFor(p.prefix)}
                setSelected={v => setFilters(p.prefix, v)}
                options={p.options}
                field={!!p.field}
                radio={!!p.radio}
                wrap={!!p.wrap}
            />
        );
    };

    // we need to include ones that might have been filter in other apps that do not apply to the current app,
    // otherwise the user will not be able to clear them from this panel
    const alreadyFilteredOn = (prefix: string) => resourceFilter.filter(f => f.startsWith(prefix + ':')).map(removePrefix(prefix));

    const kinds = tree.nodes
        .map(x => x.kind)
        .concat(alreadyFilteredOn('kind'))
        .filter(uniq)
        .sort();
    const namespaces = tree.nodes
        .map(x => x.namespace)
        .concat(alreadyFilteredOn('namespace'))
        .filter(uniq)
        .sort();

    const selectedFor = (prefix: string) => {
        return groupedFilters[prefix] ? groupedFilters[prefix].split(',').map(removePrefix(prefix)) : [];
    };

    return (
        <FiltersGroup appliedFilter={pref.resourceFilter} onClearFilter={onClearFilter} setShown={setShown} shown={shown}>
            <div className='filters-container__text-filters'>
                {ResourceFilter({label: 'KINDS', prefix: 'kind', options: kinds.map(toOption), field: true})}
                {ResourceFilter({
                    label: 'SYNC STATUS',
                    prefix: 'sync',
                    options: ['Synced', 'OutOfSync'].map(label => ({
                        label,
                        icon: <ComparisonStatusIcon status={label as SyncStatusCode} noSpin={true} />
                    }))
                })}
            </div>
            {ResourceFilter({
                label: 'HEALTH STATUS',
                prefix: 'health',
                options: ['Healthy', 'Progressing', 'Degraded', 'Suspended', 'Missing', 'Unknown'].map(label => ({
                    label,
                    icon: <HealthStatusIcon state={{status: label as HealthStatusCode, message: ''}} noSpin={true} />
                }))
            })}
            <div className='filters-container__subgroup'>
                {namespaces.length > 1 &&
                    ResourceFilter({label: 'NAMESPACES', prefix: 'namespace', options: (namespaces || []).filter(l => l && l !== '').map(toOption), field: true})}
                {ResourceFilter({label: 'OWNERSHIP', prefix: 'ownership', wrap: true, options: ['Owners', 'Owned'].map(toOption)})}
                {ResourceFilter({label: 'AGE', prefix: 'createdWithin', options: ['1m', '3m', '5m', '15m', '60m'].map(toOption), radio: true, wrap: true})}
            </div>
        </FiltersGroup>
    );
};
