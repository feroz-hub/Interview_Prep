using System;

//What is Encapsulation?

namespace What_is_Encapsulation
{
    class Program
    {

        public class Employee
        {
            //Make field private
            private int empExperience;

            public int EmpExperience
            {
                get { return empExperience; }

                set { empExperience = value; }
            }

            //Shortcut Property
            //public int EmpExperience { get; set; }
        }

        static void Main(string[] args)
        {
            Employee objEmployee = new Employee();

            objEmployee.EmpExperience = 3;
        }

       
         //public class Employee
        //{
        //    public int empExperience;
        //}

        //static void Main(string[] args)
        //{
        //    Employee objEmployee = new Employee();

        //    objEmployee.empExperience = 3;
        //}


    }
}
