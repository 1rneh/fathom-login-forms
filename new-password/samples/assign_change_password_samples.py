import argparse
import pandas as pd


def main(num_domains: int, assignee: str, shuffled: bool):
    domains = pd.read_csv(
        'tranco_100k_alexa_100k_union_shuffled_2019-12-14.csv',
        sep="\t",
        dtype={
            'shuffled #': int,
            'Trexa # ': int,
            'domain': str,
            'assigned for new-password forms': str,
            'assigned for change-password forms': str,
            'note': str
        },
    )

    if shuffled:
        sort_column = 'shuffled #'
    else:
        sort_column = 'Trexa # '

    # Get the next n domains
    next_n = domains[domains['assigned for change-password forms'].isnull()].sort_values(sort_column).head(num_domains)

    # Assign them to the assignee
    row_values = domains[sort_column].isin(next_n[sort_column].values)
    domains.loc[row_values, 'assigned for change-password forms'] = assignee.upper()

    # Print the list of trexa number and domain
    print(f'Next {num_domains} {sort_column.split(" ")[0]} domains have been assigned to {assignee.upper()}')
    print(next_n[['Trexa # ', 'domain']].to_string(index=False))

    # Save the new assignments
    domains.to_csv('tranco_100k_alexa_100k_union_shuffled_2019-12-14.csv', sep='\t', index=False)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Assigns the desired number of domains to the given person and prints the assignments. You can switch between the Trexa ordering and the shuffled ordering with the --shuffled flag.')
    parser.add_argument('num_domains', type=int, help='The number of domains you want')
    parser.add_argument('assignee', type=str, help='The name to assign to ("DANIEL", "ERIK", or "VLAD")')
    parser.add_argument('--shuffled', action='store_true', help='Switches from top domains to shuffled domains.')
    args = parser.parse_args()

    main(args.num_domains, args.assignee, args.shuffled)
