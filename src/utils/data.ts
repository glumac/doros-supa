export const feedQuery = `*[_type == "pomodoro" && completed == true]|order(launchAt desc)[0..20]  {
    image{
      asset->{
        url
      }
    },
    _id,
    launchAt,
    task,
    notes,
    completed,
    postedBy->{
      _id,
      userName,
      image
    },
    likes[]{
      _id,
      _key,
      postedBy->{
        _id,
        userName,
        image
      },
    },
    comments[]{
      _key,
      commentText,
      postedBy->{
        _id,
        userName,
        image
      },
    },
  }`;

export const lastWeek = `*[_type == "pomodoro" && completed == true && dateTime(_createdAt) > dateTime(now()) - 60*60*24*7]{
  launchAt,
  postedBy->{
    _id,
    userName,
    image
  }
}`;

// RFC3339-dateTime string for 12:01 am on the current day
const today = new Date().toISOString().split("T")[0] + "T00:01:00Z";

export const lastLastWeek = `*[_type == "pomodoro" && completed == true && dateTime(_createdAt) > dateTime('${today}') - 60*60*24*7 && dateTime(_createdAt) < dateTime('${today}')]{
  launchAt,
  postedBy->{
    _id,
    userName,
    image
  }
}`;

export const doroDetailQuery = (pinId: string): string => {
  const query = `*[_type == "pomodoro" && _id == '${pinId}']{
    image{
      asset->{
        url
      }
    },
    _id,
    launchAt,
    task,
    notes,
    completed,
    postedBy->{
      _id,
      userName,
      image
    },
    likes[]{
      _id,
      _key,
      postedBy->{
        _id,
        userName,
        image
      },
    },
    comments[]{
      _key,
      commentText,
      postedBy->{
        _id,
        userName,
        image
      },
    },
  }`;
  return query;
};

export const searchQuery = (searchTerm: string): string => {
  const query = `*[_type == "pomodoro" && task match '${searchTerm}*' || notes match '${searchTerm}*']{
    image{
      asset->{
        url
      }
    },
    _id,
    launchAt,
    task,
    notes,
    completed,
    postedBy->{
      _id,
      userName,
      image
    },
    likes[]{
      _key,
      postedBy->{
        _id,
        userName,
        image
      },
    },
    comments[]{
      _key,
      commentText,
      postedBy->{
        _id,
        userName,
        image
      },
    },
  }`;
  return query;
};

export const userQuery = (userId: string): string => {
  const query = `*[_type == "user" && _id == '${userId}']`;
  return query;
};

export const userCreatedDorosQuery = (userId: string): string => {
  const query = `*[ _type == 'pomodoro' && completed == true && userId == '${userId}'] | order(_createdAt desc){
    image{
      asset->{
        url
      }
    },
    _id,
    launchAt,
    task,
    notes,
    completed,
    postedBy->{
      _id,
      userName,
      image
    },
    likes[]{
      _id,
      _key,
      postedBy->{
        _id,
        userName,
        image
      },
    },
    comments[]{
      _key,
      commentText,
      postedBy->{
        _id,
        userName,
        image
      },
    },
  }`;
  return query;
};
