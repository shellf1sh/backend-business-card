export const EXAMPLE_QUERY = `query BusinessCard {
  profile {
    name
    description
    links { label url }
    skills { name }
    experience {
      company
      position
      startDate
      endDate
      achievements
    }
    projects {
      name
      description
      url
      repositoryUrl
      technologies
    }
  }
}`;
