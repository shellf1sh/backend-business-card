export interface ProfileRelations {
  links: boolean;
  skills: boolean;
  experience: boolean;
  projects: boolean;
}

export interface LinkView {
  label: string;
  url: string;
}

export interface SkillView {
  name: string;
}

export interface ExperienceView {
  company: string;
  position: string;
  startDate: Date;
  endDate: Date | null;
  achievements: string[];
}

export interface ProjectView {
  name: string;
  description: string;
  url: string;
  repositoryUrl: string | null;
  technologies: string[];
}

export interface ProfileView {
  name: string;
  description: string;
  links?: LinkView[];
  skills?: SkillView[];
  experience?: ExperienceView[];
  projects?: ProjectView[];
}
